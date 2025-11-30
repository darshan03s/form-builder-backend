import app from "./index.js"
import { connectDB } from './db/index.js'

function start() {
  console.log({
    airtableClientId: process.env.AIRTABLE_CLIENT_ID ? true : false,
    airtableClientSecret: process.env.AIRTABLE_CLIENT_SECRET ? true : false,
    mongoUri: process.env.MONGO_URI ? true : false
  })
  connectDB().then(() => {
    app.listen(3000, () => {
      console.log('Listening...')
    })
  }).catch((e) => {
    console.error(e)
  })
}
start()