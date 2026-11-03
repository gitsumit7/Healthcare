// Stops dev processes this project left behind (vite, the API, its local MongoDB) so `npm run dev` can start.
// Runs automatically before `npm run dev` (the "predev" script) and on its own as `npm run dev:stop`.
//
// Closing a terminal often kills only the top process: vite keeps port 5173, the API keeps 5000 and mongod keeps
// server/.data locked, so the next start fails. Unlike `taskkill /IM node.exe` this only touches processes that
// belong to this project: ones listening on its dev ports, the mongod using its data folder, and node processes
// started from inside the project folder. Anything else holding a port is reported, never killed.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'server', '.data', 'db');
const PORTS = [5173, Number(process.env.API_PORT) || 5000];
const isWindows = process.platform === 'win32';
const lower = (s) => String(s || '').toLowerCase();

// Fast path: listing processes is slow on Windows (PowerShell alone takes seconds), so first check cheaply whether
// anything is in the way at all. A connect attempt sees a listener on any address; binding a test socket does not.
const listening = (port, host) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(400, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });

// mongod holds an exclusive lock on mongod.lock while it runs.
function databaseLocked() {
  try {
    fs.closeSync(fs.openSync(path.join(DB_PATH, 'mongod.lock'), 'r+'));
    return false;
  } catch (err) {
    return err.code === 'EBUSY' || err.code === 'EPERM';
  }
}

const busyPorts = [];
for (const port of PORTS) if ((await listening(port, '127.0.0.1')) || (await listening(port, '::1'))) busyPorts.push(port);
if (!busyPorts.length && !databaseLocked()) process.exit(0);

// Every process with its parent and command line, plus which of our ports each one listens on.
function snapshot() {
  if (isWindows) {
    const script =
      'Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; ppid = $_.ParentProcessId; name = $_.Name; cmd = $_.CommandLine } } | ConvertTo-Json -Compress';
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const procs = JSON.parse(out || '[]');
    // netstat is much faster than Get-NetTCPConnection. Lines look like: TCP  [::1]:5173  [::]:0  LISTENING  21772
    for (const line of execFileSync('netstat', ['-ano'], { encoding: 'utf8' }).split('\n')) {
      const [, port, pid] = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/) || [];
      const p = PORTS.includes(Number(port)) && procs.find((x) => x.pid === Number(pid));
      if (p) p.port = Number(port);
    }
    return procs;
  }
  const procs = execFileSync('ps', ['-axo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [, pid, ppid, name, cmd] = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/) || [];
      return { pid: Number(pid), ppid: Number(ppid), name: path.basename(name || ''), cmd };
    });
  for (const port of PORTS) {
    const r = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
    for (const pid of r.stdout.split('\n').filter(Boolean).map(Number)) {
      const p = procs.find((x) => x.pid === pid);
      if (p) p.port = port;
    }
  }
  return procs;
}

function stop(pid) {
  if (isWindows) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

const procs = snapshot();
const byPid = new Map(procs.map((p) => [p.pid, p]));

// Never touch this script or the npm run that started it.
const protectedPids = new Set();
for (let p = byPid.get(process.pid); p && !protectedPids.has(p.pid); p = byPid.get(p.ppid)) protectedPids.add(p.pid);
protectedPids.add(process.pid);

const isNodeOrMongo = (p) => /^(node|mongod)/i.test(p.name);
// The dev tools this project runs from its own node_modules.
const DEV_TOOL = /concurrently|[\\/]vite[\\/]|mongodb-memory-server/;
const targets = new Map();
const blockers = [];
for (const p of procs) {
  if (protectedPids.has(p.pid)) continue;
  const cmd = lower(p.cmd);
  const ours =
    (/^mongod/i.test(p.name) && cmd.includes(lower(DB_PATH))) ||
    (/^node/i.test(p.name) && cmd.includes(lower(ROOT)) && DEV_TOOL.test(cmd)) ||
    (p.port && isNodeOrMongo(p));
  if (ours) targets.set(p.pid, p);
  else if (p.port) blockers.push(p);
}
// A `node --watch server.js` parent would start the old API again on the next file change.
for (const p of [...targets.values()]) {
  const parent = byPid.get(p.ppid);
  if (parent && !protectedPids.has(parent.pid) && /^node/i.test(parent.name) && /--watch/.test(parent.cmd || '')) {
    targets.set(parent.pid, parent);
  }
}

for (const p of targets.values()) stop(p.pid);
if (targets.size) {
  console.log(`[dev] Stopped ${targets.size} leftover process(es) from an earlier run.`);
  // Give Windows a moment to release the ports and the database lock.
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
for (const p of blockers) {
  console.warn(`[dev] Port ${p.port} is used by another program (${p.name}, PID ${p.pid}); close it or change the port.`);
}
