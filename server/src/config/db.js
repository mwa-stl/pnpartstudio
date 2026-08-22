// server/db.js (or db.ts)
import mongoose from 'mongoose';

mongoose.set('strictQuery', false); // place BEFORE connect to avoid warnings in v7+ [reference requirement]

// Prefer env var from Atlas “Drivers” page
const uri = process.env.MONGODB_URI; // e.g. mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/mydb?retryWrites=true&w=majority

export async function connectDB() {
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable');
  }
  try {
    await mongoose.connect(uri, {
      // Optional but handy: keep DB name out of the URI query if desired
      dbName: process.env.DB_NAME || undefined,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }

  mongoose.connection.on('error', (e) => console.error('Mongo error:', e));
  mongoose.connection.on('disconnected', () => console.warn('Mongo disconnected'));
}
