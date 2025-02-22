// import { exchangeCodeForToken } from "../services/lineAuthService.js";
// import User from "../models/User.js"; // Import User model
// import logger from "../utils/logger.js";
// import fetch from "node-fetch";

// export const exchangeCode = async (req, res) => {
//   const { code, state } = req.body;

//   // Validate input
//   if (
//     !code ||
//     typeof code !== "string" ||
//     !state ||
//     typeof state !== "string"
//   ) {
//     return res.status(400).json({ error: "Invalid code or state" });
//   }

//   try {
//     // Exchange code for tokens
//     const tokens = await exchangeCodeForToken(code, state);

//     if (!tokens.access_token) {
//       return res
//         .status(400)
//         .json({ error: "No access token received from LINE API" });
//     }

//     // Fetch user profile from LINE API
//     const lineProfileResponse = await fetch(
//       process.env.LINE_PROFILE_URL || "https://api.line.me/v2/profile",
//       {
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${tokens.access_token}`,
//         },
//       }
//     );

//     if (!lineProfileResponse.ok) {
//       const errorDetail = await lineProfileResponse.json();
//       throw new Error(
//         `Failed to fetch user profile: ${
//           errorDetail.message || "Unknown error"
//         }`
//       );
//     }

//     const userProfile = await lineProfileResponse.json();

//     // Check if user already exists in the database
//     let existingUser = await User.findOne({ userId: userProfile.userId });

//     if (!existingUser) {
//       // If no user found, create a new user
//       const email = userProfile.email || null;

//       const newUser = new User({
//         userId: userProfile.userId,
//         displayName: userProfile.displayName || "Anonymous",
//         fullname: userProfile.displayName || "Anonymous",
//         pictureUrl: userProfile.pictureUrl,
//         statusMessage: userProfile.statusMessage,
//         email,
//         role: "user", // Default role as 'user'
//         profileCompleted: false, // ค่าเริ่มต้นเมื่อผู้ใช้ยังไม่ได้กรอกข้อมูลครบถ้วน
//       });

//       // Save new user to the database
//       await newUser.save();
//       logger.info("New user created:", newUser);

//       existingUser = newUser;
//     } else {
//       logger.info("User already exists:", existingUser);
//     }

//     // Respond with tokens and user data
//     res.json({
//       message: "Login successful",
//       accessToken: tokens.access_token,
//       user: {
//         userId: existingUser.userId,
//         displayName: existingUser.displayName,
//         pictureUrl: existingUser.pictureUrl,
//         statusMessage: existingUser.statusMessage,
//         role: existingUser.role, // Ensure role is sent back
//       },
//     });
//   } catch (error) {
//     logger.error("Error exchanging code for token:", error);
//     res.status(500).json({
//       error: error.message || "Failed to exchange code for token",
//     });
//   }
// };

import { exchangeCodeForToken } from "../services/lineAuthService.js";
import User from "../models/User.js"; // Import User model
import logger from "../utils/logger.js";
import fetch from "node-fetch";

export const exchangeCode = async (req, res) => {
  const { code, state } = req.body;

  // Validate input
  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    return res.status(400).json({ error: "Invalid code or state" });
  }

  try {
    // Exchange code for tokens from LINE API
    const tokens = await exchangeCodeForToken(code, state);

    if (!tokens.access_token) {
      return res.status(400).json({ error: "No access token received from LINE API" });
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
      throw new Error(`Failed to fetch user profile: ${errorDetail.message || "Unknown error"}`);
    }

    const userProfile = await lineProfileResponse.json();

    // Log the user profile for debugging
    logger.debug("LINE User Profile:", userProfile);

    // Check if user already exists in the database
    let existingUser = await User.findOne({ userId: userProfile.userId });

    if (!existingUser) {
      // If no user found, create a new user
      const email = userProfile.email || null; // ใช้ email จาก LINE ถ้ามี หรือ null ถ้าไม่มี

      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        email, // บันทึก email ถ้ามี หรือ null ถ้าไม่มี
        role: "user",
        profileCompleted: !!email, // ตั้งค่าเป็น true เฉพาะเมื่อมี email
      });

      // Save new user to the database
      await newUser.save();
      logger.info("New user created:", newUser);

      existingUser = newUser;
    } else {
      // If user exists, update email if provided by LINE (but don't override if null)
      if (userProfile.email) {
        existingUser.email = userProfile.email; // อัปเดต email ถ้ามีจาก LINE
        existingUser.profileCompleted = true; // ตั้งค่าเป็น true ถ้ามี email
        await existingUser.save();
      } else if (existingUser.email === null) {
        existingUser.profileCompleted = false; // ยังคงเป็น false ถ้ายังไม่มี email
        await existingUser.save();
      }
      logger.info("User already exists, updated if necessary:", existingUser);
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
        role: existingUser.role,
        email: existingUser.email, // ส่ง email กลับไปด้วย (ถ้ามี)
        profileCompleted: existingUser.profileCompleted,
      },
    });
  } catch (error) {
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};
