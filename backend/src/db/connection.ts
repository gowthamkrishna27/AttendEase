import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env['MONGODB_URI'];
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅  MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err);
    throw err;
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️   MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌  MongoDB error:', err);
});
