const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(cors());
app.use(express.json()); // Parses incoming JSON payload

// Global request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection
mongoose.connect(MONGODB_URI).then(() => {
  console.log("Connected to MongoDB successfully!");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

// Routes
app.use('/webhook', webhookRoutes);

// Healthcheck
app.get('/', (req, res) => {
  res.send('WhatsApp AI Sales Bot Backend is running');
});

const https = require('https');

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Keep-alive ping to prevent Render free tier from sleeping
  const keepAlive = () => {
    https.get('https://whatsapp-chatbot-tm3g.onrender.com', 
    (res) => {
      console.log('Keep-alive ping:', res.statusCode);
    }).on('error', (err) => {
      console.log('Ping error:', err.message);
    });
  };

  // Ping every 14 minutes
  setInterval(keepAlive, 14 * 60 * 1000);
});
