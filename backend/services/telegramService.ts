import type {
  GeneratedMessageContent,
  MessageQueryOptions,
  ProductIdentity,
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
import { getSearchPage } from './searchPagination';
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
} from './productMatching';
import { processDealAlerts } from './dealAlertService';
import { getGeminiIdentitySetting } from './appSettings';
import { extractLocalProductIdentity, mergeProductIdentities } from './localProductIdentity';
import { planDealEnrichment, preserveVerifiedFacts } from './dealEnrichment';
import { createLogger } from './logger';

const AI_MATCH_THRESHOLD = 0.92;
const enrichmentLogger = createLogger('deal-enrichment');

export type DealIngestionRejection = {
  code: 'stale_message' | 'blocked_product' | 'low_context' | 'sale_mode_unprofitable'
    | 'duplicate_source' | 'duplicate_message';
  filter: string;
  reason: string;
};

type SaveMessageOptions = {
  onRejected?: (rejection: DealIngestionRejection) => void;
};

async function getFilterRejection(
  textContent: string,
  messageDate: number,
): Promise<DealIngestionRejection | null> {
  if (!isRecentMessage(messageDate)) {
    console.log('Skipping message older than 5 minutes');
    return {
      code: 'stale_message',
      filter: 'recent-message filter',
      reason: 'The message is older than 5 minutes.',
    };
  }

  const blacklist = await getDealBlacklist();
  if (shouldSkipBadProducts(textContent, blacklist)) {
    console.log('Skipping blocked product deal for blocked brand');
    return {
      code: 'blocked_product',
      filter: 'blocked brand/product filter',
      reason: 'The message matches a blocked brand and product combination.',
    };
  }

  if (isLowContext(textContent)) {
    console.log('Skipping low-context message');
    return {
      code: 'low_context',
      filter: 'low-context filter',
      reason: 'The message does not contain enough product or offer context.',
    };
  }

  const isSaleMode = process.env.IS_SALE_MODE === 'true';
  if (isSaleMode && !isProfitableProduct(textContent)) {
    console.log('Skipping non-profitable product in sale mode');
    return {
      code: 'sale_mode_unprofitable',
      filter: 'sale-mode profitability filter',
      reason: 'The product is not eligible while sale mode is enabled.',
    };
  }

  return null;
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
  amazonAsin?: string | null,
): Promise<ProductMatchCandidate[]> {
  const tokens = getCandidateSearchTokens(text);
  const tokenPatterns = tokens.map((token) => ({
    text: { $regex: new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i') },
  }));
  const query: Record<string, unknown> = {};
  if (amazonAsin) query.$and = [{ $or: [{ amazonAsin }, { amazonAsin: null }] }];
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

function parsePrice(price: string | number | null | undefined): number | null {
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

  const baselinePrice = parsePrice(message.price);
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

export async function saveMessage(message: TelegramInboundMessage, options: SaveMessageOptions = {}) {
  try {
    const { message_id, chat, date, text: originalText, caption, photo } = message;
    const textContent = originalText || caption || '';
    const channelId = String(chat.id);
    const telegramMessageId = String(message_id);
    const sourceKey = `${channelId}:${telegramMessageId}`;
    const observedAt = new Date(date * 1000);

    const filterRejection = await getFilterRejection(textContent, date);
    if (filterRejection) {
      options.onRejected?.(filterRejection);
      return null;
    }

    const existingObservation = await DealPriceObservation.exists({ sourceKey });
    if (existingObservation) {
      console.log('Skipping duplicate Telegram source observation');
      options.onRejected?.({
        code: 'duplicate_source',
        filter: 'duplicate-source filter',
        reason: 'This source message has already been processed.',
      });
      return null;
    }

    const existingMessage = await TelegramMessage.findOne({
      messageId: telegramMessageId,
      channelId,
    }).lean();

    if (existingMessage) {
      console.log('Skipping duplicate Telegram message ID');
      options.onRejected?.({
        code: 'duplicate_message',
        filter: 'duplicate-message filter',
        reason: 'A message with this source ID has already been processed.',
      });
      return null;
    }

    const cleanedText = replaceLinksAndText(textContent);
    const incomingAmazonUrl = extractAmazonUrls(cleanedText).at(-1) || null;
    const directAmazonAsin = extractAmazonAsin(incomingAmazonUrl);
    const directAsinMatch = directAmazonAsin
      ? await findDeterministicMatch(directAmazonAsin)
      : null;
    const matchedMessageHasImage = Boolean(directAsinMatch?.message.imageUrl?.trim());
    const imageData = directAsinMatch && incomingAmazonUrl && matchedMessageHasImage
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
    const localExtraction = extractLocalProductIdentity(canonicalText);
    const localIdentity = localExtraction.identity;
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
    const geminiIdentitySetting = await getGeminiIdentitySetting();
    const enrichmentReasons = planDealEnrichment({
      enabled: geminiIdentitySetting.enabled,
      isAmazonDeal,
      hasMatch: Boolean(deterministicResult),
      captionReady: captionReadiness.ready,
      identityConfidence: localExtraction.confidence,
      category: localCategoryDecision.category,
      price: localPrice,
    });
    const useGemini = enrichmentReasons.length > 0;
    if (!useGemini) {
      const localProcessingReason = deterministicResult
        ? deterministicResult.method
        : !geminiIdentitySetting.enabled
        ? 'gemini-deal-enrichment-disabled'
        : cheapLocalProcessing
        ? (localCategoryDecision.category === 'fashion' ? 'fashion' : 'price-under-1000')
        : 'amazon-local-approval';
      console.log(
        'Skipping Gemini for locally handled deal:',
        localProcessingReason,
      );
    }
    const candidates = useGemini && !deterministicResult
      ? await findMatchCandidates(canonicalText, localCategory, amazonAsin)
      : [];
    const enrichmentContext = {
      price: localPrice || undefined,
      category: localCategoryDecision.confidence === 'high' ? localCategory : undefined,
      identity: localIdentity,
      matchedProductId: deterministicResult ? String(deterministicResult.message._id) : undefined,
      amazonAsin,
    };
    if (useGemini) enrichmentLogger.info('Enriching deal in one combined Gemini operation', {
      reasons: enrichmentReasons, candidateCount: candidates.length, sourceKey,
    }, { event: 'gemini_deal_enrichment' });
    const processedContent: GeneratedMessageContent = useGemini
      ? preserveVerifiedFacts(
          await generateMessageContent(canonicalText, candidates, enrichmentContext),
          canonicalText,
          enrichmentContext,
        )
      : {
          normalizedText: canonicalText,
          category: localCategoryDecision.category === 'fashion'
            ? 'fashion'
            : localCategory,
          price: localPrice,
          usedFallback: false,
        };
    processedContent.identity = mergeProductIdentities(localIdentity, processedContent.identity);
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
        matchedMessage = await TelegramMessage.findOne({
          _id: selectedCandidate.id,
          ...(amazonAsin ? { $or: [{ amazonAsin }, { amazonAsin: null }] } : {}),
        });
        matchMethod = 'gemini-candidate';
        matchConfidence = processedContent.match.confidence;
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
      matchedMessage.price = numericPrice ?? matchedMessage.price;
      matchedMessage.amazonAsin = amazonAsin || matchedMessage.amazonAsin;
      matchedMessage.identity = mergeProductIdentities(
        matchedMessage.identity as ProductIdentity | undefined,
        processedContent.identity,
      );
      matchedMessage.identityKey = buildIdentityKey(matchedMessage.identity as ProductIdentity)
        || matchedMessage.identityKey;
      try {
        const updatedMessage = await matchedMessage.save();
        await invalidateDealCaches(String(updatedMessage._id));
        await processDealAlerts({
          _id: updatedMessage._id,
          text: updatedMessage.text,
          price: updatedMessage.price,
          link: updatedMessage.link,
          imageUrl: updatedMessage.imageUrl,
          telegramFileId: updatedMessage.telegramFileId,
        }, sourceKey).catch((error) => {
          console.error('Error processing deal alerts:', error);
        });
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
      price: numericPrice,
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
    await processDealAlerts(savedMessage, sourceKey).catch((error) => {
      console.error('Error processing deal alerts:', error);
    });
    return savedMessage;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

export async function getMessages(options: MessageQueryOptions = {}) {
  return options.search?.trim() ? getSearchPage(TelegramMessage, options) : getMessagesFromStore(TelegramMessage, options);
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
