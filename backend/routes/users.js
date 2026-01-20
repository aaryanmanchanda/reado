const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const REDIRECT_URI = 'https://api.reado.co.in/users/auth/google/callback';
const FRONTEND_READING = 'https://www.reado.co.in/reading';
const FRONTEND_LOGIN_FAIL = 'https://www.reado.co.in/login';

// GET /users/auth/google — redirect to Google OAuth authorization page
router.get('/auth/google', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.redirect(`${FRONTEND_LOGIN_FAIL}?error=oauth_failed`);
    }
    const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      response_type: 'code',
      prompt: 'consent',
    });
    res.redirect(authUrl);
  } catch (err) {
    console.error('Error initiating Google OAuth:', err);
    res.redirect(`${FRONTEND_LOGIN_FAIL}?error=oauth_failed`);
  }
});

// GET /users/auth/google/callback — exchange code for tokens, find/create user, JWT, redirect
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error || !code) {
      return res.redirect(`${FRONTEND_LOGIN_FAIL}?error=oauth_failed`);
    }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const jwtSecret = process.env.JWT_SECRET;
    if (!clientId || !clientSecret || !jwtSecret) {
      return res.redirect(`${FRONTEND_LOGIN_FAIL}?error=oauth_failed`);
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: userInfo } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const { id: googleId, name, email, picture } = userInfo;
    const accessToken = tokens.access_token || '';

    let user = await User.findOne({ googleId });
    if (user) {
      user.name = name;
      user.email = email;
      user.picture = picture;
      user.accessToken = accessToken;
      user.lastLogin = new Date();
      if (tokens.refresh_token) user.refreshToken = tokens.refresh_token;
      await user.save();
    } else {
      user = new User({
        googleId,
        name,
        email,
        picture,
        accessToken,
        refreshToken: tokens.refresh_token || undefined,
        lastLogin: new Date(),
      });
      await user.save();
    }

    const tokenPayload = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      picture: user.picture,
    };
    const jwtToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });
    res.redirect(`${FRONTEND_READING}?token=${encodeURIComponent(jwtToken)}`);
  } catch (err) {
    console.error('Error in Google OAuth callback:', err);
    res.redirect(`${FRONTEND_LOGIN_FAIL}?error=oauth_failed`);
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