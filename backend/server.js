const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
// CORS middleware at the very top, with explicit config for dev
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors()); // Explicitly handle preflight requests
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Example route
app.get('/', (req, res) => {
  res.send('API is running');
});

// CORS test route
app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const { authGoogle, authGoogleCallback } = require('./routes/authGoogle');

// OAuth routes mounted on app directly so /users/auth/google is always matched
app.get('/users/auth/google', authGoogle);
app.get('/users/auth/google/callback', authGoogleCallback);

app.use('/comments', commentRoutes);
app.use('/users', userRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
