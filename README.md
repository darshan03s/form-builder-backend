# Form Builder – Backend

## Features

* Airtable OAuth login
* Stores user data
* Fetches Airtable bases, tables, and fields
* Creates form schemas
* Validates form submissions
* Uploads attachments
* Saves responses to Airtable and MongoDB
* Lists stored form responses

---

## Tech Stack

* Node.js + Express
* MongoDB + Mongoose
* Multer (file upload)
* Airtable REST API

---

## 1. Local Development Setup

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create a `.env` file using:

```bash
cp sample.env.example .env
```

Fill in:

```
AIRTABLE_CLIENT_ID=
AIRTABLE_CLIENT_SECRET=
AIRTABLE_REDIRECT_URI=
FRONTEND_URL=
BACKEND_URL=
MONGO_URI=
```

### Run the server

```bash
pnpm dev
```

Server runs on:

```
http://localhost:3000
```
---

## 2. Data Models

### User

Stores Airtable OAuth info.

### Form

Stores:

* owner
* airtableBaseId
* airtableTableId
* questions[]
* conditionalRules

### Response

Stores:

* airtableRecordId
* answers object
* timestamps
* deletedInAirtable flag

---

## 8. Deployment (Render)

### Steps

1. Push backend repo to GitHub
2. Deploy to Render
3. Set environment variables:

```
AIRTABLE_CLIENT_ID=
AIRTABLE_CLIENT_SECRET=
AIRTABLE_REDIRECT_URI=https://your-backend.com/auth/airtable/callback
FRONTEND_URL=https://your-frontend.vercel.app
BACKEND_URL=https://your-backend.com
MONGO_URI=
```
