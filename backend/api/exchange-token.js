import admin from "firebase-admin";
import fetch from "node-fetch";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "chrome-extension://kdjkegciiimdmbomiimofpiciokocajh");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: "access_token is required" });
  }
  try {
    const tokeninfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`);
    if (!tokeninfoRes.ok) {
      const body = await tokeninfoRes.text();
      return res.status(400).json({ error: "Invalid access token", details: body });
    }
    const info = await tokeninfoRes.json();
    if (!admin.apps.length) {
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        return res.status(500).json({ error: "Firebase Admin not configured" });
      }
      try {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)),
        });
      } catch (initErr) {
        return res.status(500).json({ error: "Failed to initialize Firebase Admin" });
      }
    }
    const uid = info.sub;
    const additionalClaims = { provider: "google" };
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    res.json({ customToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
