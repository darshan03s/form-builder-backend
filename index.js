import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { db } from './db/index.js'

const app = express()

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Form builder backend')
})

function start() {
  console.log({
    airtableClientId: process.env.AIRTABLE_CLIENT_ID ? true : false,
    airtableClientSecret: process.env.AIRTABLE_CLIENT_SECRET ? true : false,
    mongoUri: process.env.MONGO_URI ? true : false
  })
  db.connect().then(() => {
    app.listen(3000, () => {
      console.log('Listening...')
    })
  }).catch((e) => {
    console.error(e)
  })
}

start()