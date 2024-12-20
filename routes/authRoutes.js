const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

// Debugging route initialization
console.log("Auth Routes Initialized");

// Route: POST /auth/exchange-code
router.post("/exchange-code", async (req, res) => {
  console.log("Endpoint hit: /auth/exchange-code");
  console.log("Request body:", req.body);

  const { code, state } = req.body;

  if (!code || !state) {
    console.error("Missing required parameters: code or state");
    return res.status(400).json({ error: "Missing code or state" });
  }

  const data = new URLSearchParams();
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", "http://localhost:3000/callback"); // Redirect URI
  data.append("client_id", process.env.LINE_CLIENT_ID); // Channel ID
  data.append("client_secret", process.env.LINE_CLIENT_SECRET); // Channel Secret

  try {
    const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      console.error("Failed to exchange code:", await response.text());
      return res.status(400).json({ error: "Failed to exchange code" });
    }

    const tokenData = await response.json();
    console.log("Token Data:", tokenData);

    res.json({ accessToken: tokenData.access_token });
  } catch (error) {
    console.error("Error during token exchange:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
