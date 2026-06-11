
/**
 * Script to fetch historic messages from a Telegram channel
 * Run with: node fetchHistoricMessages.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Telegram } from 'telegraf';
import TelegramMessage from '../models/TelegramMessage';
import { saveMessage } from '../services/telegramService';
import type { TelegramInboundMessage } from '../services/telegramTypes';

type TelegramHistoryClient = Telegram & {
  getChannelHistory?: (
    chatId: string,
    options: { limit: number; from_message_id?: number },
  ) => Promise<TelegramInboundMessage[]>;
};

// Validate required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is required');
  process.exit(1);
}

if (!process.env.TELEGRAM_CHANNEL_ID) {
  console.error('TELEGRAM_CHANNEL_ID is required');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN);
const channelId = process.env.TELEGRAM_CHANNEL_ID;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    fetchMessages();
  })
  .catch((err: unknown) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

async function fetchMessages() {
  try {
    console.log('Starting to fetch messages...');
    
    // Get the latest message we have in our database
    const latestMessage = await TelegramMessage.findOne({ channelId })
      .sort({ date: -1 })
      .lean();
    
    // Set the starting message ID
    let fromMessageId = undefined;
    if (latestMessage) {
      console.log(`Found latest message with ID ${latestMessage.messageId}, date: ${latestMessage.date}`);
      fromMessageId = parseInt(latestMessage.messageId);
    }
    
    // Fetch messages from Telegram
    const messages = await (telegram as TelegramHistoryClient).getChannelHistory?.(channelId, {
      limit: 100,
      from_message_id: fromMessageId
    });

    if (!messages) {
      throw new Error('Telegram getChannelHistory is not available');
    }
    
    console.log(`Fetched ${messages.length} messages from Telegram`);
    
    // Process and save messages
    const savePromises = messages.map((msg) => saveMessage(msg));
    await Promise.all(savePromises);
    
    console.log('All messages saved successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fetching messages:', error);
    process.exit(1);
  }
}
