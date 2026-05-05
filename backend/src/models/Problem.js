const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  problemId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  userName: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userAvatar: {
    type: String,
    required: true
  },
  location: {
    lat: Number,
    lng: Number,
    name: String,
    pincode: String
  },
  image: {
    type: String
  },
  category: {
    type: String,
    default: 'default'
  },
  aiSolution: {
    type: String,
    required: true
  },
  authority: {
    authority: String,
    platform: String,
    steps: [String]
  },
  status: {
    type: String,
    default: 'Open',
    enum: ['Open', 'In Progress', 'Resolved']
  },
  votes: {
    type: Number,
    default: 0
  },
  votedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    id: {
      type: String,
      required: true
    },
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Problem', problemSchema);
