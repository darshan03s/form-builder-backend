import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import User from '../db/models/user.js';

const router = express.Router();

const REDIRECT_URI = process.env.AIRTABLE_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

const SCOPES = 'data.records:read data.records:write schema.bases:read schema.bases:write webhook:manage user.email:read';

const pkceStore = new Map();

const base64URLEncode = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const generateCodeVerifier = () => base64URLEncode(crypto.randomBytes(32));
const generateCodeChallenge = (verifier) => base64URLEncode(crypto.createHash('sha256').update(verifier).digest());

router.get('/airtable', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  pkceStore.set(state, codeVerifier);

  const params = new URLSearchParams({
    client_id: process.env.AIRTABLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://airtable.com/oauth2/v1/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

router.get('/airtable/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state || !pkceStore.has(state)) {
    return res.status(400).send('Invalid OAuth callback');
  }

  const codeVerifier = pkceStore.get(state);
  pkceStore.delete(state);

  try {
    const credentials = Buffer.from(`${process.env.AIRTABLE_CLIENT_ID}:${process.env.AIRTABLE_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await axios.post(
      'https://airtable.com/oauth2/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code.toString(),
        client_id: process.env.AIRTABLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const whoami = await axios.get('https://api.airtable.com/v0/meta/whoami', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = whoami.data;

    await User.updateOne(
      { airtableUserId: user.id },
      {
        $set: {
          airtableUserId: user.id,
          email: user.email,
          profile: user,
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
          loginTimestamp: new Date(),
          lastSeenAt: new Date()
        }
      },
      { upsert: true }
    );

    res.redirect(`${FRONTEND_URL}/auth/signin?success=true&userId=${user.id}&email=${user.email}`);
  } catch (err) {
    console.error('OAuth failed:', err.response?.data || err.message);
    res.status(500).send('Login failed');
  }
});

router.get('/verify', async (req, res) => {
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const urlObj = new URL(fullUrl);

  const userId = urlObj.searchParams.get('userId');

  const user = await User.findOne({ airtableUserId: userId })

  if (!user) {
    res.status(401).json({ error: 'Not authorized' })
    return
  }

  const expiresIn = user.tokenExpiresAt
  if (new Date() > expiresIn) {
    res.status(401).json({ error: 'Not authorized' })
    return
  }

  res.status(200).json({ userId: user.airtableUserId, email: user.email })
})

export default router;