const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: function() {
      return this.name ? this.name.charAt(0).toUpperCase() : '?';
    }
  },
  profile: {
    age: {
      type: Number,
      min: 13,
      max: 120
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say'
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200
    },
    phone: {
      type: String,
      trim: true
    },
    socialMedia: {
      twitter: String,
      linkedin: String,
      facebook: String,
      instagram: String
    }
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
