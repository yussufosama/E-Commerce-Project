import mongoose from 'mongoose';

// Fail promptly instead of leaving requests waiting when MongoDB is unavailable.
mongoose.set('bufferTimeoutMS', 5000);

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in backend/.env before starting.');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}
