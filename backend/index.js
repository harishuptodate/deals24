
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const telegramRoutes = require('./routes/telegram');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Routes
app.use('/api/telegram', telegramRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Initialize Telegram bot if token exists
    if (process.env.TELEGRAM_BOT_TOKEN) {
      initTelegramBot();
    } else {
      console.warn('TELEGRAM_BOT_TOKEN not provided. Bot will not be initialized.');
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Initialize Telegram bot
function initTelegramBot() {
  try {
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    // Log when bot starts
    bot.launch().then(() => {
      console.log('Telegram bot started');
    });
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Failed to initialize Telegram bot', error);
  }
}
