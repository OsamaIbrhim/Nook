import mongoose from 'mongoose';
import { env } from './env.js';

const connectionOptions = { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 20000, maxPoolSize: 5 };

export async function connectDatabase(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, connectionOptions);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
