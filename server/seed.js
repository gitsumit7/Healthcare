import 'dotenv/config';
import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './seedData.js';

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set. The in-memory database is seeded automatically when the server starts.');
  process.exit(1);
}

try {
  await connectDB();
  await seedDatabase({ reset: true });
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
