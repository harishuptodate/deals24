import type { Request, Response } from 'express';
import type {
  MessageQueryOptions,
  TelegramInboundMessage,
} from './telegramTypes';
import TelegramMessage from '../models/TelegramMessage';
import { extractLinks } from '../utils/messageParser';
import { detectCategory } from '../utils/categoryDetector';
import { redis } from '../services/redisClient';
import {
  calculateHash,
  hashString,
  isLowContext,
  isProfitableProduct,
  isRecentMessage,
  normalizeMessage,
  replaceLinksAndText,
  resolveImageData,
  shouldSkipTwsDeal,
} from './telegramMessageFilters';
import { generateMessageContent } from './telegramMessageContent';
import { getMessagesFromStore } from './telegramMessageQuery';

let contentHashes: string[] = [];
let imageUrlHashes: string[] = [];

type ClickTrackingRequest = Request<{ id: string }>;

function rememberHash(hashes: string[], nextHash: string, maxSize: number): string[] {
  hashes.push(nextHash);
  if (hashes.length > maxSize) {
    hashes.shift();
  }
  return hashes;
}

function rollbackHash(hashes: string[], value: string | null): string[] {
  if (!value) {
    return hashes;
  }
  return hashes.filter((hash) => hash !== value);
}

function shouldSkipMessage(textContent: string, messageDate: number): boolean {
  if (!isRecentMessage(messageDate)) {
    console.log('Skipping message older than 5 minutes');
    return true;
  }

  const messageHash = calculateHash(textContent);
  if (contentHashes.includes(messageHash)) {
    console.log('Skipping duplicate content');
    return true;
  }

  if (shouldSkipTwsDeal(textContent)) {
    console.log('Skipping TWS deal for blocked brand');
    return true;
  }

  if (isLowContext(textContent)) {
    console.log('Skipping low-context message');
    return true;
  }

  const isSaleMode = process.env.IS_SALE_MODE === 'true';
  if (isSaleMode && !isProfitableProduct(textContent)) {
    console.log('Skipping non-profitable product in sale mode');
    return true;
  }

  return false;
}

export async function saveMessage(message: TelegramInboundMessage) {
  try {
    const { message_id, chat, date, text: originalText, caption, photo } = message;
    const textContent = originalText || caption || '';
    const channelId = String(chat.id);
    const telegramMessageId = String(message_id);

    if (shouldSkipMessage(textContent, date)) {
      return null;
    }

    const messageHash = calculateHash(textContent);
    const existingMessage = await TelegramMessage.findOne({
      messageId: telegramMessageId,
      channelId,
    }).lean();

    if (existingMessage) {
      console.log('Skipping duplicate Telegram message ID');
      return null;
    }

    const cleanedText = replaceLinksAndText(textContent);
    const link = extractLinks(cleanedText);
    const imageData = await resolveImageData(cleanedText, photo);
    const imageHash = imageData.imageUrl ? hashString(imageData.imageUrl) : null;

    if (imageHash && imageUrlHashes.includes(imageHash)) {
      console.log('Skipping message due to duplicate Amazon image URL');
      return null;
    }

    contentHashes = rememberHash(contentHashes, messageHash, 50);
    if (imageHash) {
      imageUrlHashes = rememberHash(imageUrlHashes, imageHash, 15);
    }

    const processedContent = await generateMessageContent(cleanedText);
    const newMessage = new TelegramMessage({
      messageId: telegramMessageId,
      text: processedContent.normalizedText,
      date: new Date(date * 1000),
      link,
      imageUrl: imageData.imageUrl,
      telegramFileId: imageData.telegramFileId,
      category: processedContent.category,
      price: processedContent.price,
      clicks: 0,
      channelId,
    });

    console.log('Saving new message with category:', processedContent.category, 'and image data:', {
      imageUrl: imageData.imageUrl,
      telegramFileId: imageData.telegramFileId,
    });

    try {
      return await newMessage.save();
    } catch (error) {
      contentHashes = rollbackHash(contentHashes, messageHash);
      imageUrlHashes = rollbackHash(imageUrlHashes, imageHash);
      throw error;
    }
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

export async function getMessages(options: MessageQueryOptions = {}) {
  return getMessagesFromStore(TelegramMessage, options);
}

export async function handleClickTracking(req: ClickTrackingRequest, res: Response) {
  const messageId = req.params.id;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  const redisClickKey = `clicks:msg:${messageId}`;
  const istDate = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  );
  istDate.setHours(0, 0, 0, 0);
  const dailyKey = `clicks:daily:${istDate.toISOString().slice(0, 10)}`;

  try {
    const updatedClickCount = await redis.incr(redisClickKey);
    await redis.incr(dailyKey);

    console.log(`Redis click count updated for message ${messageId} -> ${updatedClickCount}`);
    res.json({ success: true, clicks: updatedClickCount });
  } catch (error) {
    console.error('Redis click tracking error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
}

export async function incrementClicks(messageId: string) {
  if (!messageId) {
    console.error('Cannot increment clicks: message ID is missing');
    return null;
  }

  try {
    const updatedMessage = await TelegramMessage.findByIdAndUpdate(
      messageId,
      { $inc: { clicks: 1 } },
      { new: true },
    );

    if (!updatedMessage) {
      console.log(`No message found with ID: ${messageId} for click tracking`);
    } else {
      console.log(`Mongo updated for ${messageId}: ${updatedMessage.clicks} clicks`);
    }

    return updatedMessage;
  } catch (error) {
    console.error(`Error incrementing clicks for message ${messageId}:`, error);
    return null;
  }
}
