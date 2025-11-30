import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRouter from './routes/auth.js';

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Form builder backend')
})

app.use('/auth', authRouter);

export default app