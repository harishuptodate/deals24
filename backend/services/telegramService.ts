import type {
  MessageQueryOptions,
  ProductMatchCandidate,
  TelegramInboundMessage,
} from './telegramTypes';
import TelegramMessage from '../models/TelegramMessage';
import DealPriceObservation from '../models/DealPriceObservation';
import { extractLinks } from '../utils/messageParser';
import { invalidateDealCaches, redis } from '../services/redisClient';
import {
  hasAmazonLinks,
  extractAmazonUrls,
  isLowContext,
  isProfitableProduct,
  isRecentMessage,
  removeDisallowedEmojis,
  replaceLinksAndText,
  resolveImageData,
  shouldSkipBadProducts,
} from './telegramMessageFilters';
import { generateMessageContent } from './telegramMessageContent';
import { getMessagesFromStore } from './telegramMessageQuery';
import { getDealBlacklist } from './blacklistService';
import {
  cleanAmazonProductUrl,
  extractAmazonAsin,
  replaceLastAmazonUrl,
} from './amazon/amazonLink';
import { detectCategory, detectCategoryDecision } from './detectCategory';
import { extractPrice } from '../utils/extractPrice';
import {
  assessDealTextReadiness,
  buildIdentityKey,
  getCandidateSearchTokens,
  shouldUseLocalDealProcessing,
  shouldUseGeminiForDeal,
} from './productMatching';

const AI_MATCH_THRESHOLD = 0.92;

async function shouldSkipMessage(textContent: string, messageDate: number): Promise<boolean> {
  if (!isRecentMessage(messageDate)) {
    console.log('Skipping message older than 5 minutes');
    return true;
  }

  const blacklist = await getDealBlacklist();
  if (shouldSkipBadProducts(textContent, blacklist)) {
    console.log('Skipping blocked product deal for blocked brand');
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanAmazonUrlOrOriginal(value: string): string {
  try {
    return cleanAmazonProductUrl(value);
  } catch {
    return value;
  }
}

async function findDeterministicMatch(amazonAsin: string | null) {
  if (amazonAsin) {
    const message = await TelegramMessage.findOne({
      $or: [
        { amazonAsin },
        { link: { $regex: new RegExp(`/dp/${escapeRegExp(amazonAsin)}(?:[/?#]|$)`, 'i') } },
      ],
    });
    if (message) return { message, method: 'amazon-asin' } as const;
  }

  return null;
}

async function findMatchCandidates(
  text: string,
  category: string,
): Promise<ProductMatchCandidate[]> {
  const tokens = getCandidateSearchTokens(text);
  const tokenPatterns = tokens.map((token) => ({
    text: { $regex: new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i') },
  }));
  const query: Record<string, unknown> = {};
  if (category !== 'miscellaneous') {
    query.category = category;
  }
  if (tokenPatterns.length > 0) {
    query.$or = tokenPatterns;
  } else if (category === 'miscellaneous') {
    return [];
  }

  const candidates = await TelegramMessage.find(query)
    .sort({ date: -1 })
    .limit(10)
    .select({ text: 1, category: 1, identity: 1 })
    .lean();

  return candidates.map((candidate) => ({
    id: String(candidate._id),
    text: String(candidate.text || '').slice(0, 500),
    category: candidate.category || undefined,
    identity: candidate.identity || undefined,
  }));
}

function parsePrice(price: string): number | null {
  const value = Number(price);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

async function recordObservation(input: {
  productId: unknown;
  sourceKey: string;
  observedAt: Date;
  price: number | null;
  link: string | null;
  matchMethod: string;
  matchConfidence: number | null;
}): Promise<boolean> {
  try {
    await DealPriceObservation.create(input);
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

async function ensureBaselineObservation(message: InstanceType<typeof TelegramMessage>) {
  const existingHistory = await DealPriceObservation.exists({ productId: message._id });
  if (existingHistory) return;

  const baselinePrice = parsePrice(message.price || '');
  if (!baselinePrice) return;

  await recordObservation({
    productId: message._id,
    sourceKey: `baseline:${message._id}`,
    observedAt: message.date || message.createdAt || new Date(),
    price: baselinePrice,
    link: message.link || null,
    matchMethod: 'baseline',
    matchConfidence: 1,
  });
}

export async function saveMessage(message: TelegramInboundMessage) {
  try {
    const { message_id, chat, date, text: originalText, caption, photo } = message;
    const textContent = originalText || caption || '';
    const channelId = String(chat.id);
    const telegramMessageId = String(message_id);
    const sourceKey = `${channelId}:${telegramMessageId}`;
    const observedAt = new Date(date * 1000);

    if (await shouldSkipMessage(textContent, date)) {
      return null;
    }

    const existingObservation = await DealPriceObservation.exists({ sourceKey });
    if (existingObservation) {
      console.log('Skipping duplicate Telegram source observation');
      return null;
    }

    const existingMessage = await TelegramMessage.findOne({
      messageId: telegramMessageId,
      channelId,
    }).lean();

    if (existingMessage) {
      console.log('Skipping duplicate Telegram message ID');
      return null;
    }

    const cleanedText = replaceLinksAndText(textContent);
    const incomingAmazonUrl = extractAmazonUrls(cleanedText).at(-1) || null;
    const directAmazonAsin = extractAmazonAsin(incomingAmazonUrl);
    const directAsinMatch = directAmazonAsin
      ? await findDeterministicMatch(directAmazonAsin)
      : null;
    const imageData = directAsinMatch && incomingAmazonUrl
      ? {
          imageUrl: null,
          telegramFileId: null,
          amazonUrl: cleanAmazonUrlOrOriginal(incomingAmazonUrl),
        }
      : await resolveImageData(cleanedText, photo);
    const canonicalText = imageData.amazonUrl
      ? replaceLastAmazonUrl(cleanedText, imageData.amazonUrl)
      : cleanedText;
    const link = imageData.amazonUrl || extractLinks(canonicalText);
    const amazonAsin = extractAmazonAsin(imageData.amazonUrl || link);
    const isAmazonDeal = Boolean(amazonAsin || imageData.amazonUrl || hasAmazonLinks(canonicalText));
    const localCategoryDecision = detectCategoryDecision(canonicalText);
    const localCategory = detectCategory(canonicalText);
    const localPrice = extractPrice(canonicalText);
    const cheapLocalProcessing = shouldUseLocalDealProcessing(
      localCategoryDecision.category,
      localPrice,
    );
    const captionReadiness = assessDealTextReadiness({
      text: canonicalText,
      link: link || null,
      price: localPrice,
      category: localCategoryDecision.category,
      categoryConfidence: localCategoryDecision.confidence,
    });
    const deterministicResult = directAsinMatch || (isAmazonDeal
      ? await findDeterministicMatch(amazonAsin)
      : null);
    const useGemini = shouldUseGeminiForDeal({
      isAmazonDeal,
      hasDeterministicMatch: Boolean(deterministicResult),
      localApprovalPassed: captionReadiness.ready,
      category: localCategoryDecision.category,
      price: localPrice,
    });
    if (!useGemini) {
      const localProcessingReason = deterministicResult
        ? deterministicResult.method
        : cheapLocalProcessing
        ? (localCategoryDecision.category === 'fashion' ? 'fashion' : 'price-under-1000')
        : 'amazon-local-approval';
      console.log(
        'Skipping Gemini for locally handled deal:',
        localProcessingReason,
      );
    }
    const candidates = useGemini
      ? await findMatchCandidates(canonicalText, localCategory)
      : [];
    const processedContent = useGemini
      ? await generateMessageContent(canonicalText, candidates)
      : {
          normalizedText: canonicalText,
          category: localCategoryDecision.category === 'fashion'
            ? 'fashion'
            : localCategory,
          price: localPrice,
          usedFallback: false,
        };
    const textToSave = removeDisallowedEmojis(processedContent.normalizedText).trim();
    const identityKey = buildIdentityKey(processedContent.identity);

    let matchedMessage = deterministicResult?.message || null;
    let matchMethod = deterministicResult?.method || 'new';
    let matchConfidence: number | null = deterministicResult ? 1 : null;

    if (!matchedMessage && useGemini && processedContent.match?.sameProduct) {
      const selectedCandidate = candidates.find(
        (candidate) => candidate.id === processedContent.match?.candidateId,
      );
      if (selectedCandidate && processedContent.match.confidence >= AI_MATCH_THRESHOLD) {
        matchedMessage = await TelegramMessage.findById(selectedCandidate.id);
        matchMethod = 'gemini-candidate';
        matchConfidence = processedContent.match.confidence;
      }
    }

    if (!matchedMessage && useGemini && identityKey) {
      matchedMessage = await TelegramMessage.findOne({ identityKey });
      if (matchedMessage) {
        matchMethod = 'gemini-identity';
        matchConfidence = 0.95;
      }
    }

    const numericPrice = parsePrice(processedContent.price);
    if (matchedMessage) {
      await ensureBaselineObservation(matchedMessage);
      const observationCreated = await recordObservation({
        productId: matchedMessage._id,
        sourceKey,
        observedAt,
        price: numericPrice,
        link: link || null,
        matchMethod,
        matchConfidence,
      });
      if (!observationCreated) return null;

      matchedMessage.text = textToSave;
      matchedMessage.date = observedAt;
      matchedMessage.messageId = telegramMessageId;
      matchedMessage.channelId = channelId;
      matchedMessage.lastSeenAt = observedAt;
      matchedMessage.firstSeenAt = matchedMessage.firstSeenAt || matchedMessage.createdAt || observedAt;
      matchedMessage.link = link || matchedMessage.link;
      matchedMessage.imageUrl = imageData.imageUrl || matchedMessage.imageUrl;
      matchedMessage.telegramFileId = imageData.telegramFileId || matchedMessage.telegramFileId;
      matchedMessage.category = processedContent.category;
      matchedMessage.price = processedContent.price || matchedMessage.price;
      matchedMessage.amazonAsin = amazonAsin || matchedMessage.amazonAsin;
      matchedMessage.identity = processedContent.identity || matchedMessage.identity;
      matchedMessage.identityKey = identityKey || matchedMessage.identityKey;
      try {
        const updatedMessage = await matchedMessage.save();
        await invalidateDealCaches(String(updatedMessage._id));
        console.log('Updated existing product price history:', String(updatedMessage._id));
        return updatedMessage;
      } catch (error) {
        await DealPriceObservation.deleteOne({ sourceKey });
        throw error;
      }
    }

    const newMessage = new TelegramMessage({
      messageId: telegramMessageId,
      text: textToSave,
      date: observedAt,
      link,
      imageUrl: imageData.imageUrl,
      telegramFileId: imageData.telegramFileId,
      category: processedContent.category,
      price: processedContent.price,
      amazonAsin,
      identity: processedContent.identity,
      identityKey,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
      clicks: 0,
      channelId,
    });

    console.log('Saving new message with category:', processedContent.category, 'and image data:', {
      imageUrl: imageData.imageUrl,
      telegramFileId: imageData.telegramFileId,
    });

    const savedMessage = await newMessage.save();
    try {
      const observationCreated = await recordObservation({
        productId: savedMessage._id,
        sourceKey,
        observedAt,
        price: numericPrice,
        link: link || null,
        matchMethod,
        matchConfidence,
      });
      if (!observationCreated) {
        await TelegramMessage.deleteOne({ _id: savedMessage._id });
        return null;
      }
    } catch (error) {
      await TelegramMessage.deleteOne({ _id: savedMessage._id });
      throw error;
    }
    await invalidateDealCaches(String(savedMessage._id));
    return savedMessage;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

export async function getMessages(options: MessageQueryOptions = {}) {
  return getMessagesFromStore(TelegramMessage, options);
}

export async function trackMessageClick(messageId: string): Promise<number> {
  const redisClickKey = `clicks:msg:${messageId}`;
  const istDate = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  );
  istDate.setHours(0, 0, 0, 0);
  const dailyKey = `clicks:daily:${istDate.toISOString().slice(0, 10)}`;

  const updatedClickCount = await redis.incr(redisClickKey);
  await redis.incr(dailyKey);
  console.log(`Redis click count updated for message ${messageId} -> ${updatedClickCount}`);
  return updatedClickCount;
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
