const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const REDIRECT_URI = 'https://api.reado.co.in/users/auth/google/callback';
const FRONTEND_READING = 'https://www.reado.co.in/reading';
const FRONTEND_LOGIN_FAIL = 'https://www.reado.co.in/login';

function authGoogle(req, res) {
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
}

async function authGoogleCallback(req, res) {
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
}

module.exports = { authGoogle, authGoogleCallback };
