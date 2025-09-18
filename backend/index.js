import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ------------------- MIDDLEWARES -------------------


// Define allowed origins
const allowedOrigins = [
  "http://localhost:5173",   // dev
  "chrome-extension://*",    // chrome extension
  "https://your-frontend.com" // prod
];

// Apply CORS to all requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow chrome extensions
    if (origin && origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any localhost port for development
    if (origin && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Allow larger payloads for base64 images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Multer: use /tmp for Vercel ephemeral storage -- important!
const upload = multer({ dest: "/tmp" });

// Google Auth
let credentials = null;
try {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not set");
  if (raw.trim().startsWith("{")) {
    credentials = JSON.parse(raw);
  } else {
    const fullPath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    const content = fs.readFileSync(fullPath, "utf8");
    credentials = JSON.parse(content);
  }
} catch (e) {
  console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", e.message);
  // continue; some routes might still work without credentials
}

// Initialize firebase-admin if credentials were parsed
let db = null;
try {
  if (credentials && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    db = admin.firestore();
    console.log('Initialized firebase-admin and Firestore');
  }
} catch (e) {
  console.error('Failed to init firebase-admin:', e.message);
}

const auth = new GoogleAuth({
  credentials: credentials || undefined,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION || "us-central1";

// ------------------- ROUTES ------------------- //

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    firebaseConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  });
});

// POST /exchange-token
// Body: { access_token: string }
// Verifies the Google access token and exchanges it for a Firebase custom token.
app.post("/exchange-token", async (req, res) => {
  console.log("Exchange token request received:", { 
    hasAccessToken: !!req.body.access_token,
    origin: req.get('origin'),
    userAgent: req.get('user-agent')
  });

  const { access_token } = req.body;
  if (!access_token) {
    console.error("No access token provided");
    return res.status(400).json({ error: "access_token is required" });
  }

  try {
    // Verify token via Google tokeninfo endpoint
    console.log("Verifying token with Google...");
    const tokeninfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`);
    if (!tokeninfoRes.ok) {
      const body = await tokeninfoRes.text();
      console.error("Token verification failed:", body);
      return res.status(400).json({ error: "Invalid access token", details: body });
    }
    const info = await tokeninfoRes.json();
    console.log("Token verified for user:", info.sub);

    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.log("Initializing Firebase Admin...");
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        console.error("GOOGLE_APPLICATION_CREDENTIALS_JSON not set");
        return res.status(500).json({ error: "Firebase Admin not configured" });
      }
      
      try {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)),
        });
        console.log("Firebase Admin initialized successfully");
      } catch (initErr) {
        console.error("Failed to initialize Firebase Admin:", initErr);
        return res.status(500).json({ error: "Failed to initialize Firebase Admin" });
      }
    }

    const uid = info.sub; // Google user id
    const additionalClaims = { provider: "google" };

    console.log("Creating custom token for user:", uid);
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    console.log("Custom token created successfully");
    
    res.json({ customToken });
  } catch (err) {
    console.error("Error in /exchange-token:", err);
    res.status(500).json({ error: err.message });
  }
});




// GET /fetch-image?url=<image-url>
app.get("/fetch-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.arrayBuffer();
    res.set("Content-Type", response.headers.get("content-type"));
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Error in /fetch-image:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /upload
app.post("/upload", upload.array("files", 4), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files.map((file) => ({
      originalName: file.originalname,
      path: file.path,
    }));
    res.json({ files });
  } catch (err) {
    console.error("Error in /upload:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /generate-look
app.post(
  "/generate-look",
  upload.fields([
    { name: "userImgs", maxCount: 1 },
    { name: "fitImg", maxCount: 1 },
  ]),
  async (req, res) => {
    // Verify Firebase ID token if provided in Authorization header (Bearer <idToken>)
    let verifiedUid = null;
    try {
      const authHeader = req.get('Authorization') || req.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1].trim();
        if (idToken && admin && admin.auth) {
          const decoded = await admin.auth().verifyIdToken(idToken);
          verifiedUid = decoded.uid;
        }
      }
    } catch (e) {
      console.warn('Failed to verify ID token for generate-look:', e.message);
      // continue but don't block generation; we still allow anonymous generation
    }
    try {
      const userFile = req.files["userImgs"]?.[0];
      const fitFile = req.files["fitImg"]?.[0];

      if (!userFile || !fitFile) {
        return res.status(400).json({ error: "Images missing" });
      }

      const userBase64 = fs.readFileSync(userFile.path).toString("base64");
      const fitBase64 = fs.readFileSync(fitFile.path).toString("base64");

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

      const result = await response.json();
      console.log("Vertex AI response:", JSON.stringify(result, null, 2));

      if (!result.predictions || !result.predictions[0]?.bytesBase64Encoded) {
        return res.status(500).json({
          error: "Vertex AI request failed",
          details: result,
        });
      }

      
      const generated = result.predictions[0].bytesBase64Encoded;
      // If Firestore is available and we have a verified uid, increment a server-side generated looks counter
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
        console.warn('Failed to increment generatedCount in Firestore:', e.message);
      }
  res.json({ image: generated });
    } catch (err) {
      console.error("Error in /generate-look:", err);
      res.status(500).json({ error: "Failed to generate AI look", details: err.message });
    }
  }
);





export default app;

// for local testing
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log("🚀 Backend server running on http://localhost:" + PORT);
    console.log("📋 Available endpoints:");
    console.log("  GET  /health - Health check");
    console.log("  POST /exchange-token - Exchange Google token for Firebase token");
    console.log("  POST /generate-look - Generate AI look");
    console.log("  GET  /fetch-image - Fetch image by URL");
    console.log("🔧 Environment check:");
    console.log("  Firebase configured:", !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log("  GCP Project ID:", process.env.GCP_PROJECT_ID || "Not set");
    console.log("  GCP Region:", process.env.GCP_REGION || "us-central1");
  });
}



















