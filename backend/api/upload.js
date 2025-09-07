import express from "express";
import multer from "multer";

const app = express();
const upload = multer({ dest: "/tmp" });

app.post("/api/upload", upload.array("files", 4), (req, res) => {
  const files = req.files.map(file => ({
    originalName: file.originalname,
    path: file.path, // only valid during this function run
  }));
  res.json({ files });
});

export default app;
