
import fetch from "node-fetch";
import fs from "fs";
import { GoogleAuth } from "google-auth-library";
import admin from "firebase-admin";
import formidable from "formidable";

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION || "us-central1";


// Google Auth
let credentials = null;
try {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (raw && raw.trim().startsWith("{")) {
    credentials = JSON.parse(raw);
  }
} catch (e) {}
const auth = new GoogleAuth({
  credentials: credentials || undefined,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

// Firebase Admin
let db = null;
try {
  if (credentials && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    db = admin.firestore();
  }
} catch (e) {}

function setCORS(req, res) {
  const allowedOrigin = req.headers?.origin || "http://localhost:3000";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Origin", "chrome-extension://kdjkegciiimdmbomiimofpiciokocajh");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  setCORS(req, res);
  try {
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    // Parse multipart form with formidable (ESM usage)
    const form = formidable({
      multiples: false,
      uploadDir: "/tmp",
      keepExtensions: true,
      maxFileSize: 15 * 1024 * 1024, // 15MB
    });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Formidable error:", err);
        return res.status(400).json({ error: err.message });
      }
      try {
        console.log("[generate-look] Received files:", files);
        const userFileRaw = files["userImgs"] || files["userImgs[]"];
        const fitFileRaw = files["fitImg"] || files["fitImg[]"];
        // Handle array or single file
        const userFile = Array.isArray(userFileRaw) ? userFileRaw[0] : userFileRaw;
        const fitFile = Array.isArray(fitFileRaw) ? fitFileRaw[0] : fitFileRaw;
        if (!userFile || !fitFile) {
          return res.status(400).json({ error: "Images missing", files });
        }
        const userPath = userFile.filepath || userFile.path;
        const fitPath = fitFile.filepath || fitFile.path;
        if (!userPath || !fitPath) {
          console.error("Missing file path(s):", { userPath, fitPath, userFile, fitFile });
          return res.status(400).json({ error: "File path missing for uploaded images", userPath, fitPath, userFile, fitFile });
        }
        const userBase64 = fs.readFileSync(userPath).toString("base64");
        const fitBase64 = fs.readFileSync(fitPath).toString("base64");
        // ...existing code...
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/virtual-try-on-preview-08-04:predict`;
        const body = {
          instances: [
            {
              personImage: { image: { bytesBase64Encoded: userBase64 } },
              productImages: [{ image: { bytesBase64Encoded: fitBase64 } }],
            },
          ],
          parameters: { sampleCount: 1 },
        };
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        let result;
        try {
          result = await response.json();
        } catch (jsonErr) {
          const text = await response.text();
          console.error("Vertex AI non-JSON response:", text);
          return res.status(500).json({ error: "Vertex AI returned non-JSON response", details: text });
        }
        if (!result.predictions || !result.predictions[0]?.bytesBase64Encoded) {
          console.error("Vertex AI error:", result);
          return res.status(500).json({ error: "Vertex AI request failed", details: result });
        }
        const generated = result.predictions[0].bytesBase64Encoded;
        // ...existing code...
        let verifiedUid = null;
        try {
          const authHeader = req.headers["authorization"] || req.headers["Authorization"];
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const idToken = authHeader.split("Bearer ")[1].trim();
            if (idToken && admin && admin.auth) {
              const decoded = await admin.auth().verifyIdToken(idToken);
              verifiedUid = decoded.uid;
            }
          }
        } catch (e) {
          console.warn("Failed to verify ID token:", e);
        }
        try {
          if (db && verifiedUid) {
            const metaRef = db.collection('users').doc(verifiedUid).collection('meta').doc('counts');
            await db.runTransaction(async (tx) => {
              const snap = await tx.get(metaRef);
              const data = snap.exists ? snap.data() : {};
              const prev = (data && data.generatedCount) ? data.generatedCount : 0;
              tx.set(metaRef, { generatedCount: prev + 1 }, { merge: true });
            });
          }
        } catch (e) {
          console.warn("Failed to increment generatedCount in Firestore:", e);
        }
        res.json({ image: generated });
      } catch (err) {
        console.error("Handler error:", err);
        res.status(500).json({ error: "Failed to generate AI look", details: err.message });
      }
    });
  } catch (fatalErr) {
    console.error("Fatal handler error:", fatalErr);
    res.status(500).json({ error: "Fatal server error", details: fatalErr.message });
  }
}
