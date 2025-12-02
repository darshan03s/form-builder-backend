import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Form from '../db/models/form.js'
import Response from '../db/models/response.js';
import { getTableFields } from '../utils/index.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', async (req, res) => {
  const { baseId, tableId } = req.body

  if (!baseId || !tableId) {
    return res.status(400).json({ error: 'baseId and tableId are required' });
  }

  try {
    const result = await Form.insertOne({
      owner: req.user.id,
      airtableBaseId: baseId,
      airtableTableId: tableId,
      createdAt: new Date(),
      questions: [],
    })
    res.status(201).json({ formId: result.id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not create form' })
  }
})

router.get('/', async (req, res) => {
  try {
    const forms = await Form.find({ owner: req.user._id })
    res.status(200).json({ forms })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not get all forms' })
  }
})

router.get('/:formId', async (req, res) => {
  const formId = req.params.formId;
  const form = await Form.findById(formId);

  if (!form) {
    res.status(404).json({ error: 'Form not found' })
    return
  }

  res.status(200).json({ form })
})

router.put('/:formId', async (req, res) => {
  const { formId } = req.params;
  const { questions } = req.body;

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'questions must be an array' });
  }

  try {
    const form = await Form.findById(formId);

    if (!form || form.owner.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Form not found or access denied' });
    }

    const allowedTypes = [
      'singleLineText',
      'multilineText',
      'singleSelect',
      'multipleSelects',
      'multipleAttachments'
    ];

    for (const q of questions) {
      if (!allowedTypes.includes(q.type)) {
        return res.status(400).json({ error: `Unsupported field type: ${q.type}` });
      }
      if (q.conditionalRules) {
        if (!['AND', 'OR'].includes(q.conditionalRules.logic)) {
          return res.status(400).json({ error: 'Invalid logic operator' });
        }
        if (!Array.isArray(q.conditionalRules.conditions) || q.conditionalRules.conditions.length === 0) {
          return res.status(400).json({ error: 'Conditions must be a non-empty array' });
        }
      }
    }

    form.questions = questions;
    await form.save();

    res.json({ message: 'Form updated successfully', form });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to save form' });
  }
});

router.post('/:formId/submit', upload.any(), async (req, res) => {
  const { formId } = req.params;

  try {
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const user = req.user

    const accessToken = user.accessToken;

    const tableFields = await getTableFields(form.airtableBaseId, form.airtableTableId, accessToken);

    const answers = {};
    const filesByKey = {};

    req.files.forEach(file => {
      if (!filesByKey[file.fieldname]) {
        filesByKey[file.fieldname] = [];
      }
      filesByKey[file.fieldname].push(file);
    });

    for (const q of form.questions) {
      if (q.type === 'multipleAttachments') {
        const qFiles = filesByKey[q.questionKey] || [];
        const attachments = qFiles.map(file => ({
          url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
          filename: file.originalname
        }));
        answers[q.questionKey] = attachments;

        if (q.required && attachments.length === 0) {
          return res.status(400).json({ error: `Required field missing: ${q.label}` });
        }
      } else {
        let input = req.body[q.questionKey];
        if (q.type === 'multipleSelects') {
          if (!Array.isArray(input)) {
            input = input ? [input] : [];
          }
        } else {
          input = input || null;
        }
        answers[q.questionKey] = input;

        if (q.required && (input === null || input === '' || (Array.isArray(input) && input.length === 0))) {
          return res.status(400).json({ error: `Required field missing: ${q.label}` });
        }

        const field = tableFields.find(f => f.id === q.airtableFieldId);
        if (!field) {
          return res.status(500).json({ error: `Field not found: ${q.airtableFieldId}` });
        }

        if (q.type === 'singleSelect' && input) {
          if (!field.options.choices.some(c => c.name === input)) {
            return res.status(400).json({ error: `Invalid choice for ${q.label}` });
          }
        }

        if (q.type === 'multipleSelects' && input.length > 0) {
          if (!input.every(a => field.options.choices.some(c => c.name === a))) {
            return res.status(400).json({ error: `Invalid choices for ${q.label}` });
          }
        }
      }
    }

    const fields = {};
    for (const q of form.questions) {
      fields[q.airtableFieldId] = answers[q.questionKey];
    }

    const airRes = await fetch(`https://api.airtable.com/v0/${form.airtableBaseId}/${form.airtableTableId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    if (!airRes.ok) {
      const errData = await airRes.json();
      return res.status(500).json({ error: 'Failed to save to Airtable', details: errData });
    }

    const airData = await airRes.json();
    const airtableRecordId = airData.id;

    const responseDoc = new Response({
      formId,
      airtableRecordId,
      answers,
    });
    await responseDoc.save();

    res.status(201).json({ success: true, responseId: responseDoc._id });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

router.get('/:formId/responses', async (req, res) => {
  const { formId } = req.params;
  try {
    const responses = await Response.find({ formId })
      .select('airtableRecordId answers createdAt deletedInAirtable')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = responses.map(r => ({
      submissionId: r._id.toString(),
      airtableRecordId: r.airtableRecordId,
      createdAt: r.createdAt,
      status: r.deletedInAirtable ? 'Deleted in Airtable' : 'Active',
      answersPreview: Object.entries(r.answers)
        .slice(0, 3)
        .map(([k, v]) => {
          if (Array.isArray(v) && v[0]?.url) return `${k}: ${v.length} file(s)`;
          if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
          return `${k}: ${v}`;
        })
        .join(' | '),
      answers: r.answers
    }));

    res.json({ responses: formatted });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

export default router