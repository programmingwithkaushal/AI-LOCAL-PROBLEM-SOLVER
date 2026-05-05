const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  room: {
    type: String,
    default: 'General'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
