import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_ID = process.env.PLASMO_PUBLIC_FIREBASE_CLIENT_ID;
if (!CLIENT_ID) {
  console.error("Missing PLASMO_PUBLIC_FIREBASE_CLIENT_ID in .env");
  process.exit(1);
}

const templatePath = path.resolve(__dirname, "../public/manifest.template.json");
const outPath = path.resolve(__dirname, "../build/manifest.json");

let manifest = fs.readFileSync(templatePath, "utf8");
manifest = manifest.replace(/__GOOGLE_CLIENT_ID__/g, CLIENT_ID);

fs.writeFileSync(outPath, manifest, "utf8");

console.log("Manifest generated with injected GOOGLE_CLIENT_ID");





















