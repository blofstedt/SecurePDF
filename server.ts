import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing with a higher body size limit for base64 images
  app.use(express.json({ limit: "15mb" }));

  // Shared in-memory container for mobile signature exchange
  const signatureSessions = new Map<string, string>();

  // API Check Status Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Fetch mobile signature state
  app.get("/api/signature/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const dataUrl = signatureSessions.get(sessionId);
    res.json({ signature: dataUrl || null });
  });

  // Upload mobile signature state (called by phone browser)
  app.post("/api/signature/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    const { signature } = req.body;
    if (!signature) {
      res.status(400).json({ error: "Missing signature data payload." });
      return;
    }
    signatureSessions.set(sessionId, signature);
    console.log(`[Signature Hub] Saved mobile seal for session reference: ${sessionId}`);
    res.json({ success: true });
  });

  // Clear signature state
  app.delete("/api/signature/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    signatureSessions.delete(sessionId);
    res.json({ success: true });
  });

  // Vite development middleware vs Static Production routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SecurePDF Server] Ephemeral Processing Server running on host 0.0.0.0:${PORT}`);
  });
}

startServer();
