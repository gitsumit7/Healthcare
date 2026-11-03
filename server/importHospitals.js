// CLI: npm run import:hospitals [-- --limit=20000]
import 'dotenv/config';
import { connectDB, disconnectDB } from './config/db.js';
import { importHospitals } from './utils/hospitalImport.js';

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set. With the in-memory database, hospitals are imported automatically when the server starts.');
  process.exit(1);
}

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

try {
  await connectDB();
  const result = await importHospitals({ limit, log: console.log });
  console.log(`Done: ${result.imported} hospitals added/updated (${result.fetched} records fetched).`);
} catch (err) {
  console.error('Hospital import failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
