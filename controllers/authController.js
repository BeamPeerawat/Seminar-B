import { exchangeCodeForToken } from "../services/lineAuthService.js";
import User from "../models/User.js"; // Import User model to save user data
import logger from "../utils/logger.js";
import fetch from "node-fetch";

// Backend: ปรับให้มีการกำหนด role ก่อนส่งข้อมูลไปยัง Frontend
export const exchangeCode = async (req, res) => {
  const { code, state } = req.body;

  // Validate input
  if (
    !code ||
    typeof code !== "string" ||
    !state ||
    typeof state !== "string"
  ) {
    return res.status(400).json({ error: "Invalid code or state" });
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code, state);

    if (!tokens.access_token) {
      return res
        .status(400)
        .json({ error: "No access token received from LINE API" });
    }

    // Fetch user profile from LINE API
    const lineProfileResponse = await fetch(
      process.env.LINE_PROFILE_URL || "https://api.line.me/v2/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!lineProfileResponse.ok) {
      const errorDetail = await lineProfileResponse.json();
      throw new Error(
        `Failed to fetch user profile: ${
          errorDetail.message || "Unknown error"
        }`
      );
    }

    const userProfile = await lineProfileResponse.json();

    // Check if user already exists in the database
    let existingUser = await User.findOne({
      $or: [{ userId: userProfile.userId }, { email: userProfile.email }],
    });

    if (!existingUser) {
      // If email exists, ensure it's unique
      const email = userProfile.email || null;

      // Create a new user
      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        email,
      });

      // Save new user to the database
      await newUser.save();
      logger.info("New user created:", newUser);

      existingUser = newUser;
    } else {
      logger.info("User already exists:", existingUser);
    }

    // Respond with tokens and user data
    res.json({
      message: "Login successful",
      accessToken: tokens.access_token,
      user: {
        userId: existingUser.userId,
        displayName: existingUser.displayName,
        pictureUrl: existingUser.pictureUrl,
        statusMessage: existingUser.statusMessage,
        role: existingUser.role, // ส่ง role กลับไปด้วย
      },
    });
  } catch (error) {
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};
