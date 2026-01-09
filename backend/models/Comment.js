const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  bookId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  page: Number,
  percent: Number,
  text: String,
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  nsfw: { type: Boolean, default: false },
  spoiler: {
    isSpoiler: { type: Boolean, default: false },
    source: { type: String, enum: ["llm", "user", "none"], default: "none" },
    confidence: { type: Number }
  }
});

module.exports = mongoose.model('Comment', CommentSchema);
