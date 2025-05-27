import axios from "axios";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";

export const getProfile = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Invalid or missing token" });
  }

  try {
    const response = await axios.get("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: `Failed to fetch profile: ${response.statusText}`,
      });
    }

    res.json({
      name: response.data.displayName,
      email: response.data.email,
      profilePicture: response.data.pictureUrl,
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error("Error fetching profile:", errorMessage);
    res.status(500).json({
      message: "Failed to fetch profile",
      error: errorMessage,
    });
  }
};

export const checkProfile = async (req, res) => {
  const { email, userId } = req.body;

  try {
    logger.debug("Request body for checkProfile:", req.body);
    const user = await User.findOne({ userId });

    if (user) {
      const profile = await Profile.findOne({ userId });
      return res.json({
        profileCompleted: profile ? profile.profileCompleted : false,
      });
    } else {
      return res.json({ profileCompleted: false });
    }
  } catch (error) {
    logger.error("Error checking profile:", error);
    res.status(500).json({ message: "Error checking profile" });
  }
};

export const saveProfile = async (req, res) => {
  try {
    const { name, address, phone, email, userId } = req.body;

    if (!userId || !name || !address || !phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (userId, Name, Address, or Phone)",
      });
    }

    logger.debug("Save profile request body:", req.body);

    let profile = await Profile.findOne({ userId });

    if (!profile) {
      profile = new Profile({
        userId,
        name,
        address,
        phone,
        email: email || null,
        profileCompleted: true,
      });
    } else {
      profile.name = name;
      profile.address = address;
      profile.phone = phone;
      profile.email = email || null;
      profile.profileCompleted = true;
    }

    await profile.save();
    logger.info("Profile saved or updated:", profile);

    const user = await User.findOne({ userId });
    if (user) {
      user.profileCompleted = true;
      user.updatedAt = Date.now();
      await user.save();
    }

    res.status(200).json({
      success: true,
      user: {
        userId,
        name,
        email: profile.email,
        profileCompleted: profile.profileCompleted,
      },
    });
  } catch (error) {
    logger.error("Error saving profile:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
};

export const updateProfileCompleted = async (req, res) => {
  const { userId, profileCompleted } = req.body;

  try {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { profileCompleted, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const user = await User.findOne({ userId });
    if (user) {
      user.profileCompleted = profileCompleted;
      user.updatedAt = Date.now();
      await user.save();
    }

    res.json({ message: "Profile status updated successfully", profile });
  } catch (error) {
    logger.error("Error updating profile completed status:", error);
    res.status(500).json({ error: "Failed to update profile status" });
  }
};

export const getProfileFromDB = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      email: profile.email,
      profileCompleted: profile.profileCompleted,
      addresses: profile.addresses || [], // ส่ง array ที่อยู่กลับไป
    });
  } catch (error) {
    logger.error("Error fetching profile from database:", error.message);
    res.status(500).json({
      message: "Failed to fetch profile from database",
      error: error.message,
    });
  }
};

// เพิ่มที่อยู่ใหม่
export const addAddress = async (req, res) => {
  const { userId, name, address, phone, isDefault } = req.body;

  if (!userId || !name || !address || !phone) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    let profile = await Profile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // ถ้าตั้งเป็นที่อยู่เริ่มต้น ให้ยกเลิกที่อยู่เริ่มต้นอันเก่า
    if (isDefault) {
      profile.addresses.forEach((addr) => (addr.isDefault = false));
    }

    profile.addresses.push({
      name,
      address,
      phone,
      isDefault: isDefault || false,
      createdAt: Date.now(),
    });

    await profile.save();
    res.status(200).json({ message: "Address added successfully", profile });
  } catch (error) {
    logger.error("Error adding address:", error);
    res.status(500).json({ message: "Failed to add address" });
  }
};

// ดึงรายการที่อยู่ทั้งหมด
export const getAddresses = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({ addresses: profile.addresses || [] });
  } catch (error) {
    logger.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

// อัปเดตที่อยู่
export const updateAddress = async (req, res) => {
  const { userId, name, address, phone, isDefault } = req.body;
  const { addressId } = req.params;

  if (!userId || !addressId || !name || !address || !phone) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    let profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const addr = profile.addresses.id(addressId);
    if (!addr) {
      return res.status(404).json({ message: "Address not found" });
    }

    // อัปเดตข้อมูลที่อยู่
    addr.name = name;
    addr.address = address;
    addr.phone = phone;

    // ถ้าตั้งเป็นที่อยู่เริ่มต้น ให้ยกเลิกที่อยู่เริ่มต้นอันเก่า
    if (isDefault) {
      profile.addresses.forEach((a) => (a.isDefault = false));
      addr.isDefault = true;
    }

    await profile.save();
    res.status(200).json({ message: "Address updated successfully", profile });
  } catch (error) {
    logger.error("Error updating address:", error);
    res.status(500).json({ message: "Failed to update address" });
  }
};

// ลบที่อยู่
export const deleteAddress = async (req, res) => {
  const { userId } = req.body;
  const { addressId } = req.params;

  if (!userId || !addressId) {
    return res.status(400).json({ message: "Missing userId or addressId" });
  }

  try {
    let profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const addr = profile.addresses.id(addressId);
    if (!addr) {
      return res.status(404).json({ message: "Address not found" });
    }

    profile.addresses.pull(addressId);
    await profile.save();
    res.status(200).json({ message: "Address deleted successfully", profile });
  } catch (error) {
    logger.error("Error deleting address:", error);
    res.status(500).json({ message: "Failed to delete address" });
  }
};