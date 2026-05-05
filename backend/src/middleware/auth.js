const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "solvit_super_secret_2024_change_in_prod";

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Login required" });
  try {
    const token = header.split(" ")[1];
    console.log("Verifying token:", token.substring(0, 20) + "...");
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Convert userId to ObjectId if it's a valid string
    if (decoded.id && typeof decoded.id === 'string') {
      try {
        decoded.id = new mongoose.Types.ObjectId(decoded.id);
      } catch (error) {
        // If it's not a valid ObjectId, keep it as is (for debug tokens)
        console.log("Could not convert userId to ObjectId:", error.message);
      }
    }
    
    // Check if user exists and is not blocked
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "User not found. Please login again." });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been blocked. Please contact support." });
    }
    
    req.user = decoded;
    console.log("Token verified successfully:", req.user);
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    res.status(401).json({ error: "Token expired or invalid. Please login again." });
  }
};

module.exports = { requireAuth };
