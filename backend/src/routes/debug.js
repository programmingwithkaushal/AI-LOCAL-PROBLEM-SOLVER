const express = require("express");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const router = express.Router();

// Debug JWT endpoint
router.post("/jwt-test", (req, res) => {
  try {
    const payload = { id: "test123", name: "Test User" };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    
    console.log("Generated token:", token);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded successfully:", decoded);
    
    res.json({ 
      token, 
      decoded, 
      secret: process.env.JWT_SECRET,
      message: "JWT test successful" 
    });
  } catch (error) {
    console.error("JWT test failed:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
