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
import Profile from "../models/Profile.js"; // นำเข้า Profile model
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
      const newUser = new User({
        userId: userProfile.userId,
        displayName: userProfile.displayName || "Anonymous",
        fullname: userProfile.displayName || "Anonymous",
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        role: "user",
        profileCompleted: false, // ตั้งค่าเป็น false เริ่มต้น (เช็คจาก profiles)
      });

      // Save new user to the database
      await newUser.save();
      logger.info("New user created:", newUser);

      existingUser = newUser;
    } else {
      // If user exists, check profileCompleted from Profile model
      const profile = await Profile.findOne({ userId: existingUser.userId });
      existingUser.profileCompleted = profile ? profile.profileCompleted : false;
      await existingUser.save();
      logger.info("User already exists, updated profileCompleted:", existingUser);
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
        profileCompleted: existingUser.profileCompleted,
        profile: await Profile.findOne({ userId: existingUser.userId }), // ส่งข้อมูลโปรไฟล์กลับไปด้วย
      },
    });
  } catch (error) {
    logger.error("Error exchanging code for token:", error);
    res.status(500).json({
      error: error.message || "Failed to exchange code for token",
    });
  }
};

// เพิ่มฟังก์ชันสำหรับอัปเดต profileCompleted (ตามที่แนะนำในข้อก่อนหน้า)
export const updateProfileCompleted = async (req, res) => {
  const { userId, profileCompleted } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { userId }, // ใช้ userId เป็น String
      { profileCompleted, updatedAt: Date.now() }, // อัปเดต timestamp ด้วย
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile status updated successfully", user });
  } catch (error) {
    logger.error("Error updating profile completed status:", error);
    res.status(500).json({ error: "Failed to update profile status" });
  }
};