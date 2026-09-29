import mongoose from 'mongoose';
import { connectDatabase } from '../src/database/connection.js';
import { User } from '../src/database/model/user.model.js';

// Deliberately a local operator command, never a public HTTP endpoint.
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run make-admin -- your-email@example.com');
  process.exitCode = 1;
} else {
  try {
    await connectDatabase();
    const result = await User.updateOne({ email }, { $set: { role: 'admin' } });
    if (!result.matchedCount) throw new Error('missing-user');
    console.log('Existing account granted admin access.');
  } catch {
    console.error('Could not promote the account. Register it first and check the database connection.');
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
