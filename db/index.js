import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
export const db = new MongoClient(uri);
