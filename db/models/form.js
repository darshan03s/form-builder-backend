import { Schema, model } from 'mongoose';

const conditionSchema = new Schema({
  questionKey: { type: String, required: true },
  operator: { type: String, enum: ['equals', 'notEquals', 'contains'], required: true },
  value: { type: Schema.Types.Mixed, required: true }
});

const conditionalRulesSchema = new Schema({
  logic: { type: String, enum: ['AND', 'OR'], required: true },
  conditions: [conditionSchema]
});

const questionSchema = new Schema({
  questionKey: { type: String, required: true },
  airtableFieldId: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String, enum: [
      'singleLineText',
      'multilineText',
      'singleSelect',
      'multipleSelects',
      'multipleAttachments'
    ], required: true
  },
  required: { type: Boolean, default: false },
  conditionalRules: { type: conditionalRulesSchema, required: false }
});

const formSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  airtableBaseId: { type: String, required: true },
  airtableTableId: { type: String, required: true },
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now },
});

export default model('Form', formSchema);