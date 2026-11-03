// Live updates over Server-Sent Events. Each signed-in tab keeps one stream open and is told when an
// appointment it can see changes, so dashboards update the moment an admin, doctor or patient acts.

const HEARTBEAT_MS = 25_000; // keeps proxies from closing an idle stream

const streams = new Set(); // { res, userId, role }

// GET /api/events  (any signed-in user)
export function streamEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const stream = { res, userId: String(req.user._id), role: req.user.role };
  streams.add(stream);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(heartbeat);
    streams.delete(stream);
  });
}

const idOf = (ref) => (ref?._id ?? ref)?.toString();

// Tells the appointment's patient, its doctor and every admin that it changed. The person who made the change
// already has the new state, so their own tabs are skipped. Expects the doctor populated with its user.
export function notifyAppointmentChange(appointment, actor) {
  const audience = new Set([idOf(appointment.patient), idOf(appointment.doctor?.user)].filter(Boolean));
  const actorId = actor && String(actor._id);
  const message = `event: appointment\ndata: ${JSON.stringify({ id: idOf(appointment), status: appointment.status })}\n\n`;
  for (const { res, userId, role } of streams) {
    if (userId === actorId) continue;
    if (role === 'admin' || audience.has(userId)) res.write(message);
  }
}
