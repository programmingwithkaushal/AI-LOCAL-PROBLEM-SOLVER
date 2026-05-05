const express = require("express");
const { 
  getMessages, 
  getRooms, 
  getRoomMessages, 
  createMessage, 
  deleteMessage 
} = require("../controllers/chatController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getMessages);
router.get("/rooms", requireAuth, getRooms);
router.get("/room/:room", requireAuth, getRoomMessages);
router.post("/", requireAuth, createMessage);
router.delete("/:id", requireAuth, deleteMessage);

module.exports = router;
