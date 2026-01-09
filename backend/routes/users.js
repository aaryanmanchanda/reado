const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create or update user from OAuth
router.post('/auth/google', async (req, res) => {
  try {
    const { googleId, name, email, picture, accessToken } = req.body;
    
    if (!googleId || !name || !email || !picture || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find existing user or create new one
    let user = await User.findOne({ googleId });
    
    if (user) {
      // Update existing user
      user.name = name;
      user.email = email;
      user.picture = picture;
      user.accessToken = accessToken;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        googleId,
        name,
        email,
        picture,
        accessToken,
        lastLogin: new Date()
      });
      await user.save();
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Error in Google OAuth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-accessToken -refreshToken');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get multiple users by IDs (for populating comment authors)
router.post('/batch', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    const users = await User.find({
      _id: { $in: userIds }
    }).select('name picture email');

    res.json(users);
  } catch (error) {
    console.error('Error fetching users batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a bookmark
router.post('/:userId/bookmarks', async (req, res) => {
  try {
    const { bookId, page, color } = req.body;
    if (!bookId || typeof page !== 'number' || !color) {
      return res.status(400).json({ error: 'bookId, page, and color are required' });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Prevent duplicate bookmarks for the same page/book
    user.bookmarks = user.bookmarks.filter(b => !(b.bookId === bookId && b.page === page));
    user.bookmarks.push({ bookId, page, color });
    await user.save();
    res.json(user.bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bookmarks for a user
router.get('/:userId/bookmarks', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.bookmarks || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 