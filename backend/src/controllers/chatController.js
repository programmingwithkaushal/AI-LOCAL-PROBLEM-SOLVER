const { v4: uuidv4 } = require("uuid");
const ChatMessage = require("../models/ChatMessage");

// GET chat messages (last 100)
const getMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ createdAt: -1 }).limit(100);
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedMessages = messages.map(msg => ({
      ...msg.toObject(),
      id: msg._id.toString(),
      userId: msg.userId.toString()
    }));
    
    res.json(serializedMessages.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching messages" });
  }
};

// GET chat rooms list (distinct rooms)
const getRooms = async (req, res) => {
  try {
    const messages = await ChatMessage.find().distinct('room');
    const defaultRooms = ["General", "Road Issues", "Water & Utilities", "Health & Safety", "Education", "Announcements"];
    const allRooms = [...new Set([...defaultRooms, ...messages])];
    res.json(allRooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching rooms" });
  }
};

// GET messages for a specific room
const getRoomMessages = async (req, res) => {
  try {
    const room = decodeURIComponent(req.params.room);
    const messages = await ChatMessage.find({ room }).sort({ createdAt: -1 }).limit(100);
    
    // Convert ObjectIds to strings for frontend compatibility
    const serializedMessages = messages.map(msg => ({
      ...msg.toObject(),
      id: msg._id.toString(),
      userId: msg.userId.toString()
    }));
    
    res.json(serializedMessages.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching room messages" });
  }
};

// POST new chat message
const createMessage = async (req, res) => {
  try {
    const { text, room } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Message cannot be empty" });
    
    const message = new ChatMessage({
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatar,
      text: text.trim(),
      room: room || "General",
    });
    await message.save();
    
    // Return serialized message with string ID
    const serializedMessage = {
      ...message.toObject(),
      id: message._id.toString(),
      userId: message.userId.toString()
    };
    
    res.json(serializedMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error creating message" });
  }
};

// DELETE own message
const deleteMessage = async (req, res) => {
  try {
    const result = await ChatMessage.deleteOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Message not found or not yours" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error deleting message" });
  }
};

module.exports = { getMessages, getRooms, getRoomMessages, createMessage, deleteMessage };
