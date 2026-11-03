import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './seedData.js';
import User from './models/User.js';
import Hospital from './models/Hospital.js';
import { importHospitals, hospitalImportConfigured } from './utils/hospitalImport.js';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET must be set in production');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'dev-only-insecure-secret';
  console.warn('JWT_SECRET not set - using an insecure development secret');
}

// Hosting platforms inject PORT in production; in development API_PORT keeps the API off the
// frontend dev server's port (tools that launch `npm run dev` often set PORT=5173).
const PORT =
  process.env.NODE_ENV === 'production' ? process.env.PORT || 5000 : process.env.API_PORT || 5000;

try {
  const { inMemory } = await connectDB();
  if (inMemory && (await User.countDocuments()) === 0) await seedDatabase();
  // Pull hospitals from data.gov.in in the background the first time; the local database keeps them across restarts,
  // so later starts skip the download (refresh it from the Admin page).
  if (inMemory && hospitalImportConfigured() && !(await Hospital.exists({ isDemo: { $ne: true } }))) {
    importHospitals()
      .then((r) => console.log(`Imported ${r.imported} hospitals from data.gov.in`))
      .catch((err) => console.warn('Hospital import skipped:', err.message));
  }
  const server = app.listen(PORT, () => console.log(`MediCare Connect API running on http://localhost:${PORT}`));

  // Stop the local MongoDB along with the API (Ctrl+C, a closed terminal, a --watch restart), so it does not keep
  // server/.data locked and the next start does not have to wait for it.
  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    server.close();
    await disconnectDB().catch(() => {});
    process.exit(code);
  };
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) process.once(signal, () => shutdown(0));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use - another copy of the server is probably running.\n` +
          `Run "npm run dev:stop" in the project folder (or close that terminal), or set API_PORT in server/.env to a free port.`
      );
    } else {
      console.error('Server error:', err.message);
    }
    shutdown(1);
  });
} catch (err) {
  console.error('Failed to start server:', err.message);
  process.exit(1);
}
