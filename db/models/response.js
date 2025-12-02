import { Schema, model } from 'mongoose';

const responseSchema = new Schema({
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  airtableRecordId: { type: String, required: true },
  answers: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedInAirtable: { type: Boolean, default: false },
});

export default model('Response', responseSchema);