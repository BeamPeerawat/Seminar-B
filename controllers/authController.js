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
    // Exchange code for tokens
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

    // Check if user already exists in the database
    let existingUser = await User.findOne({ userId: userProfile.userId });

    if (!existingUser) {
      // If no user found, create a new user
      const email = userProfile.email || null; // ใช้ null ถ้า email ไม่มี

      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        email, // อนุญาตให้ email เป็น null
        role: "user", // Default role as 'user'
        profileCompleted: !email, // ถ้าไม่มี email ให้ profileCompleted เป็น false
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
        role: existingUser.role, // Ensure role is sent back
        profileCompleted: existingUser.profileCompleted, // ส่งสถานะ profileCompleted กลับไปด้วย
      },
    });
  } catch (error) {
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};
