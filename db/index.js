import mongoose from 'mongoose';
const uri = process.env.MONGO_URI;
export const connectDB = async () => {
  await mongoose.connect(uri, { dbName: 'formBuilder' });
};