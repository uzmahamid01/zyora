import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ------------------- MIDDLEWARES -------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer: use /tmp for Vercel ephemeral storage -- important!
const upload = multer({ dest: "/tmp" });

// Google Auth
// const auth = new GoogleAuth({
//   scopes: ["https://www.googleapis.com/auth/cloud-platform"],
// });
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION || "us-central1";

// ------------------- ROUTES ------------------- //

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
  app.listen(5000, () => console.log("Local server running on http://localhost:5000"));
}
