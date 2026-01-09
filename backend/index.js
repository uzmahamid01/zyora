// import express from "express";
// import cors from "cors";
// import multer from "multer";
// import fetch from "node-fetch";
// import fs from "fs";
// import path from "path";
// import { GoogleAuth } from "google-auth-library";
// import admin from "firebase-admin";
// import dotenv from "dotenv";

// import { createServer as createVercelServer } from "vercel-node-server";

// dotenv.config();

// const app = express();

// // ------------------- MIDDLEWARES -------------------
// const allowedOrigins = [
//   "http://localhost:5173",
//   "chrome-extension://kdjkegciiimdmbomiimofpiciokocajh",
//   "chrome-extension://fnjejfgmebolpelbegpjekpafcammkhc",
// ];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) return callback(null, true);
//       if (origin.startsWith("http://localhost:")) return callback(null, true);
//       callback(new Error("Not allowed by CORS"));
//     },
// --- Explicit CORS headers for Vercel/Serverless ---
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "chrome-extension://kdjkegciiimdmbomiimofpiciokocajh");
//   res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
//   res.setHeader("Access-Control-Allow-Credentials", "true");
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
//   next();
// });
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "15mb" }));
// app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// const upload = multer({ dest: "/tmp" });

// // ------------------- GOOGLE CREDENTIALS -------------------
// let credentials = null;

// try {
//   const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
//   if (!raw) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON not set");

//   if (raw.trim().startsWith("{")) {
//     credentials = JSON.parse(raw);
//   } else {
//     const fullPath = path.isAbsolute(raw)
//       ? raw
//       : path.join(process.cwd(), raw);
//     credentials = JSON.parse(fs.readFileSync(fullPath, "utf8"));
//   }

//   console.log(
//     "🔍 Loaded service account:",
//     credentials.client_email
//   );
// } catch (e) {
//   console.error("❌ Failed to load service credentials:", e.message);
// Initialize firebase-admin if credentials were parsed

// Zyora backend: All API routes have moved to /api/*.js for Vercel serverless compatibility.
// This file is now only used for local development or as a placeholder.

export default function handler(req, res) {
  
  res.status(404).json({ error: "API routes are now in /api/*.js. See /api/generate-look, /api/fetch-image, /api/exchange-token, /api/health." });
}
//     });

//     db = admin.firestore();

//     console.log("✅ Firebase Admin initialized");

//   }

// } catch (e) {

//   console.error("❌ Firebase init failed:", e.message);

// }



// // ------------------- GOOGLE AUTH (VERTEX) -------------------

// const auth = new GoogleAuth({

//   credentials, // 🔍 FORCE service account (no ADC fallback)

//   scopes: ["https://www.googleapis.com/auth/cloud-platform"],

// });



// const PROJECT_ID = process.env.GCP_PROJECT_ID;

// const REGION = process.env.GCP_REGION || "us-central1";



// // ------------------- ROUTES -------------------

// // All routes are now under /api for Vercel compatibility

// const router = express.Router();


