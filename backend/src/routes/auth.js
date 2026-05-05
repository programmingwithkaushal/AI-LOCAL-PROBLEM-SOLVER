const express = require("express");
const { register, login, getProfile, updateProfile, updateAvatar } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/avatar", requireAuth, updateAvatar);

module.exports = router;
