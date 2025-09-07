import express from "express";
import fetch from "node-fetch";

const app = express();

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

export default app;
