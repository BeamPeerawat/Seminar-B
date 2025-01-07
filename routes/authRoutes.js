// routes/authRoutes.js

import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/exchange-code", async (req, res) => {
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const data = new URLSearchParams();
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", "http://localhost:3000/callback");
  data.append("client_id", process.env.LINE_CLIENT_ID);
  data.append("client_secret", process.env.LINE_CLIENT_SECRET);

  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      return res.status(400).json({ error: "Failed to exchange code" });
    }

    const tokenData = await response.json();
    res.json({ accessToken: tokenData.access_token });
  } catch (error) {
    console.error("Line API error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
