import express from 'express';
import Form from '../db/models/form.js'

const router = express.Router();

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

export default router