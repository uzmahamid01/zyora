import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// multer to handle uploads
const upload = multer({ dest: "/tmp" });

// google auth
const auth = new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const REGION = process.env.GCP_REGION || "us-central1";

// ------------------- ROUTES ------------------- //

// fetch an external image
app.get("/api/fetch-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.buffer();
    const contentType = response.headers.get("content-type");
    res.set("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// upload files (temporary in /tmp)
app.post("/api/upload", upload.array("files", 4), (req, res) => {
  const files = req.files.map(file => ({
    originalName: file.originalname,
    path: file.path,
  }));
  res.json({ files });
});

// generate look using Vertex AI
app.post(
  "/api/generate-look",
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

      if (!result.predictions || !result.predictions[0]?.bytesBase64Encoded) {
        return res.status(500).json({
          error: "Vertex AI request failed",
          details: result,
        });
      }

      const generated = result.predictions[0].bytesBase64Encoded;
      res.json({ image: generated }); // return as base64
    } catch (err) {
      console.error("Error in /generate-look:", err);
      res.status(500).json({
        error: "Failed to generate AI look",
        details: err.message,
      });
    }
  }
);

// --------- EXPORT (no app.listen) --------- //
export default app;
