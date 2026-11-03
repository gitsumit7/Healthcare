import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

let memoryServer;

// Where the dev database keeps its files, so data, logins and IDs survive `node --watch` restarts.
// Set MEMORY_DB_PERSIST=false for a fresh, auto-seeded database on every start.
const MEMORY_DB_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.data/db');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startMemoryServer() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  if (process.env.MEMORY_DB_PERSIST === 'false') return MongoMemoryServer.create();

  fs.mkdirSync(MEMORY_DB_PATH, { recursive: true });
  const options = { instance: { dbPath: MEMORY_DB_PATH, storageEngine: 'wiredTiger' } };
  // After a watch restart the previous mongod can hold the data folder for a moment.
  for (let attempt = 1; ; attempt++) {
    try {
      return await MongoMemoryServer.create(options);
    } catch (err) {
      if (attempt >= 5) throw err;
      await wait(1000 * attempt);
    }
  }
}

// Connects to MONGO_URI, or spins up a local MongoDB when none is configured.
export async function connectDB() {
  let uri = process.env.MONGO_URI;
  let inMemory = false;

  if (!uri) {
    memoryServer = await startMemoryServer();
    uri = memoryServer.getUri('medicare_connect');
    inMemory = true;
  }

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}${inMemory ? ' (local dev database)' : ''}`);
  return { inMemory };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
