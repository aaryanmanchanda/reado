const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  picture: { 
    type: String, 
    required: true 
  },
  accessToken: { 
    type: String, 
    required: true 
  },
  refreshToken: { 
    type: String 
  },
  tokenExpiry: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date, 
    default: Date.now 
  },
  bookmarks: [{
    bookId: String,
    page: Number,
    color: String
  }]
});

// Index for faster queries
UserSchema.index({ email: 1 });

module.exports = mongoose.model('User', UserSchema); 