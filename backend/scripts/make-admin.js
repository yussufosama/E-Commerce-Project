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
    const account = await User.findOne({ email }).select('_id emailVerified');
    if (!account) {
      console.error('No registered account matches this email. Register with this exact email on the website first.');
      process.exitCode = 1;
    } else if (!account.emailVerified) {
      console.error('This account is registered but its email is not verified. Complete email verification before granting admin access.');
      process.exitCode = 1;
    } else {
      await User.updateOne({ _id: account._id, emailVerified: true }, { $set: { role: 'admin' } });
      console.log('Existing verified account granted admin access. Sign in with its existing password.');
    }
  } catch {
    console.error('Could not connect to or update MongoDB. Check MONGODB_URI in backend/.env, Atlas Network Access for your current IP, and the database user credentials. No password or connection string is printed here.');
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
