const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || "solvit_super_secret_2024_change_in_prod";

// Generate unique username
const generateUsername = (name) => {
  const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
  const random = Math.random().toString(36).substring(2, 6);
  return `${baseName}${random}`;
};

// REGISTER
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ error: "An account with this email already exists" });

    // Generate unique username
    let username = generateUsername(name);
    let usernameExists = await User.findOne({ username });
    while (usernameExists) {
      username = generateUsername(name + Math.random().toString(36).substring(2, 4));
      usernameExists = await User.findOne({ username });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({
      username: username,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, username: user.username, avatar: user.avatar },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        username: user.username,
        avatar: user.avatar,
        profile: user.profile 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(400).json({ error: "No account found with this email" });

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ error: "Your account has been blocked. Please contact support." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, username: user.username, avatar: user.avatar },
      JWT_SECRET, { expiresIn: "7d" }
    );
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        username: user.username,
        avatar: user.avatar, 
        profile: user.profile,
        isBlocked: user.isBlocked 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
};

// GET current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching profile" });
  }
};

// UPDATE user profile
const updateProfile = async (req, res) => {
  try {
    const { name, profile } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update allowed fields
    if (name) user.name = name.trim();
    
    if (profile) {
      // Update profile fields
      if (profile.age !== undefined) user.profile.age = profile.age;
      if (profile.gender) user.profile.gender = profile.gender;
      if (profile.bio !== undefined) user.profile.bio = profile.bio.trim();
      if (profile.location !== undefined) user.profile.location = profile.location.trim();
      if (profile.phone !== undefined) user.profile.phone = profile.phone.trim();
      if (profile.socialMedia) {
        user.profile.socialMedia = {
          twitter: profile.socialMedia.twitter || user.profile.socialMedia.twitter,
          linkedin: profile.socialMedia.linkedin || user.profile.socialMedia.linkedin,
          facebook: profile.socialMedia.facebook || user.profile.socialMedia.facebook,
          instagram: profile.socialMedia.instagram || user.profile.socialMedia.instagram
        };
      }
    }
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    
    res.json({ user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating profile" });
  }
};

// UPDATE avatar
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.avatar = avatar;
    await user.save();
    
    res.json({ user: { id: user._id, name: user.name, email: user.email, username: user.username, avatar: user.avatar, profile: user.profile } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error updating avatar" });
  }
};

module.exports = { register, login, getProfile, updateProfile, updateAvatar };
