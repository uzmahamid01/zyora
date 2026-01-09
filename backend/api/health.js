function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "chrome-extension://kdjkegciiimdmbomiimofpiciokocajh");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

export default function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    firebaseConfigured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  });
}
