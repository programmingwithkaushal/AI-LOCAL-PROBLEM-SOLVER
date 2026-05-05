const express = require("express");
const multer = require("multer");
const { 
  getAllProblems, 
  getProblem, 
  createProblem, 
  addComment, 
  voteProblem, 
  updateStatus 
} = require("../controllers/problemController");
const { requireAuth } = require("../middleware/auth");
const { storage } = require("../config/cloudinary");

const router = express.Router();

// File upload configuration using Cloudinary
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Images only")),
});

router.get("/", getAllProblems);
router.get("/:id", getProblem);
router.post("/", requireAuth, upload.single("image"), createProblem);
router.post("/:id/comments", requireAuth, addComment);
router.post("/:id/vote", requireAuth, voteProblem);
router.patch("/:id/status", requireAuth, updateStatus);

module.exports = router;
