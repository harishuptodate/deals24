import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { Telegraf } from 'telegraf';
import { attachRequestContext } from './middleware/requestContext';
import adminRouter from './routes/admin';
import amazonRouter from './routes/amazon';
import indexRouter from './routes/index';
import statsRouter from './routes/stats.routes';
import telegramRouter from './routes/telegram';
import startFlushLoop from './scripts/flushRedisClicksToMongo';
import { installConsoleLogger, runWithLogContext } from './services/logger';
import { saveMessage } from './services/telegramService';
import type { TelegramInboundMessage } from './services/telegramTypes';

installConsoleLogger();

type TelegramBotContext = {
  message?: TelegramInboundMessage;
  channelPost?: TelegramInboundMessage;
};

type SavedTelegramResult = {
  text?: string;
} | null;

function getMessagePreview(text: string) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(attachRequestContext);
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Routes
app.use('/api', indexRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/amazon', amazonRouter);
app.use('/api', statsRouter);  // Make sure the stats routes are registered
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startFlushLoop();

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
    
    // Set webhook for production or use polling for development
    if (process.env.NODE_ENV === 'production') {
      // Set webhook URL (you need to set WEBHOOK_URL in .env)
      const webhookUrl = process.env.WEBHOOK_URL || `https://your-domain.com/api/telegram/webhook`;
      bot.telegram.setWebhook(webhookUrl)
        .then(() => {
          console.log(`Webhook set to: ${webhookUrl}`);
        })
        .catch((error: unknown) => {
          console.error('Failed to set webhook:', error);
        });
    } else {
      // Use long polling for development
      bot.launch()
        .then(() => {
          console.log('Telegram bot started in polling mode');
        })
        .catch((error: unknown) => {
          console.error('Failed to start bot in polling mode:', error);
        });
      
      // Process messages directly from getUpdates polling
      bot.on('message', (ctx: TelegramBotContext) => {
        const message = ctx.message;
        const correlationId = `tg:${message?.chat?.id || 'unknown'}:${message?.message_id || Date.now()}`;

        runWithLogContext({
          service: 'telegram-ingest',
          correlationId,
          context: {
            source: 'polling-message',
            telegramMessageId: message?.message_id || null,
          },
        }, () => {
          console.log('Received message through polling:', message);
          saveMessage(message)
            .then((result: SavedTelegramResult) => {
              if (result) {
                console.log('Message saved successfully:', getMessagePreview(result.text));
              } else {
                console.log('Message was not saved (filtered out by criteria)');
              }
            })
            .catch((error: unknown) => {
              console.error('Error saving message:', error);
            });
        });
      });
      
      // Process channel posts
      bot.on('channel_post', (ctx: TelegramBotContext) => {
        const channelPost = ctx.channelPost;
        const correlationId = `tg:${channelPost?.chat?.id || 'unknown'}:${channelPost?.message_id || Date.now()}`;

        runWithLogContext({
          service: 'telegram-ingest',
          correlationId,
          context: {
            source: 'polling-channel-post',
            telegramMessageId: channelPost?.message_id || null,
          },
        }, () => {
          console.log('Received channel post through polling:', channelPost);
          saveMessage(channelPost)
            .then((result: SavedTelegramResult) => {
              if (result) {
                console.log('Channel post saved successfully:', getMessagePreview(result.text));
              } else {
                console.log('Channel post was not saved (filtered out by criteria)');
              }
            })
            .catch((error: unknown) => {
              console.error('Error saving channel post:', error);
            });
        });
      });
    }
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Failed to initialize Telegram bot', error);
  }
}
