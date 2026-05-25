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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
