import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRouter from './routes/authRoute.js';
import formRouter from './routes/formRoute.js';
import authMiddleware from './middleware/authMiddleware.js';

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Form builder backend')
})

app.use('/auth', authRouter);
app.use('/forms', authMiddleware, formRouter);

export default app