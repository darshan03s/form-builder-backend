import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  airtableUserId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  profile: { type: Object, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiresAt: { type: Date, required: true },
  loginTimestamp: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default model('User', userSchema);