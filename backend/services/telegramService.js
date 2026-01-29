const TelegramMessage = require('../models/TelegramMessage');
const { extractLinks } = require('../utils/messageParser');
const { fetchProductImage } = require('./amazonService');
const crypto = require('crypto');
const { detectCategory } = require('../utils/categoryDetector');
const { GenerateCaptionAndCategory } = require('./CaptionAndCategoryGen');
// Hashes to store unique content (in-memory)
let contentHashes = [];
let imageUrlHashes = [];

// Track last Amazon API call time to implement rate limiting
let lastAmazonApiCall = 0;
const MIN_API_DELAY = 2000; // Minimum 2 seconds between API calls

// Helper function to check if text contains Amazon links
function hasAmazonLinks(text) {
  if (!text) return false;
  const amazonRegex = /(https?:\/\/)?(www\.)?(amazon\.[a-z]{2,}|amzn\.to)\/[^\s]*/gi;
  return amazonRegex.test(text);
}

// Helper function to extract Amazon URLs from text
function extractAmazonUrls(text) {
  if (!text) return [];
  const amazonRegex = /(https?:\/\/)?(www\.)?(amazon\.[a-z]{2,}|amzn\.to)\/[^\s]*/gi;
  const matches = text.match(amazonRegex) || [];
  return matches.map(url => {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      return 'https://' + url;
    }
    return url;
  });
}

// Helper function to get highest quality photo from Telegram message
function getHighestQualityPhoto(photos) {
  if (!photos || photos.length === 0) return null;

  return photos.reduce((largest, current) => {
    const largestSize = largest?.file_size || 0;
    const currentSize = current?.file_size || 0;
    return currentSize > largestSize ? current : largest;
  }, null);
}


// Helper function to implement rate limiting for Amazon API
async function waitForApiRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastAmazonApiCall;
  
  if (timeSinceLastCall < MIN_API_DELAY) {
    const waitTime = MIN_API_DELAY - timeSinceLastCall;
    console.log(`Rate limiting: waiting ${waitTime}ms before Amazon API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastAmazonApiCall = Date.now();
}

/**
 * Calculate hash of a message's content
 * @param {string} text - Message text
 * @returns {string} - Hash of the message content
 */
function calculateHash(text) {
  const normalizedText = normalizeMessage(text);
  return crypto.createHash('sha256').update(normalizedText).digest('hex');
}
/**
 * Calculate hash of a message's imageURL
 * @param {string} text - message's imageURL
 * @returns {string} - Hash of the message's imageURL
 */
function hashString(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Normalize the message (removing links and extra formatting)
 * @param {string} text - Message text
 * @returns {string} - Normalized text
 */
function normalizeMessage(text) {
  return text
    .replace(/https?:\/\/\S+/g, '') // Remove links
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with a single space
    .toLowerCase(); // Case-insensitive comparison
}

/**
 * Replace specific links and text
 * @param {string} text - Message text
 * @returns {string} - Text with replaced links and text
 */
function replaceLinksAndText(text) {
  let result = text;

  // Handle links
  const linksToReplace = process.env.LINKS_TO_REPLACE.split(',');
  const linkReplaceWith = process.env.LINK_REPLACE_WITH;

  for (const link of linksToReplace) {
    const regex = new RegExp(link, 'g');
    result = result.replace(regex, linkReplaceWith);
  }

  // Handle text replacements
  const textReplacements = process.env.TEXT_REPLACEMENTS.split(',');

  for (const pair of textReplacements) {
    const [from, to = ''] = pair.split(':');
    if (from) {
      const regex = new RegExp(from, 'g');
      result = result.replace(regex, to);
    }
  }

  return result.trim();
}

/**
 * Check if the message is recent (within 5 minutes)
 * @param {number} messageDate - Message date in Unix timestamp
 * @returns {boolean} - Whether the message is recent
 */
// this function only works in development mode only coz use of polling instead of webhooks
function isRecentMessage(messageDate) {
  const messageTimestamp = messageDate * 1000;
	const currentTimestamp = Date.now();
	return currentTimestamp - messageTimestamp <= 5 * 60 * 1000; 
}

/**
 * Check if the message is low context
 * @param {string} text - Message text
 * @returns {boolean} - Whether the message is low context
 */
function isLowContext(text) {
  const meaningfulText = text.replace(/https?:\/\/\S+/g, '').trim(); // Remove links
  if (meaningfulText.length < 30) return true; // Too short
  const lowContextKeywords = ['loot', 'deal', 'link', 'fast', 'price drop'];
  const keywordMatch = lowContextKeywords.some((keyword) =>
    meaningfulText.toLowerCase().includes(keyword)
  );
  return keywordMatch && meaningfulText.length < 60; // Keywords but no big context
}

/**
 * Check if the product is profitable
 * @param {string} text - Message text
 * @returns {boolean} - Whether the product is profitable
 */
function isProfitableProduct(text) {
  const profitableKeywords = [
    'tv', 'tvs', '4ktvs', '4k', 'laptop', 'washing machine', 'ai',
    'kg', '12 kg', '9 kg', '7 kg', '8 kg', '6.5 kg', '10 kg', '8.5 kg',
    'front load', 'top load', 'air conditioner', 'ac', 'acs', 'ton',
    'refrigerator', '653 l', 'single door', 'double door', 'triple door',
    'side by side', 'intel', 'core', 'ryzen', 'bravia',
  ];

  for (let keyword of profitableKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i'); // Ensure proper boundary matching
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Save a new message from Telegram (incorporating core logic with image handling)
 * @param {Object} message - Telegram message object
 * @returns {Promise<Object>} - Saved message
 */
async function saveMessage(message) {
  try {
    // Extract message details
    const { message_id, chat, date, text: originalText, caption, photo } = message;
    const textContent = originalText || caption || '';
    const channelId = chat.id.toString();
    
    // Skip if the message is not recent (more than 5 minutes old)
    if (!isRecentMessage(date)) {
      console.log('Skipping message older than 5 minutes');
      return null;
    }
    
    // Check if the message content is duplicate based on hash
    const messageHash = calculateHash(textContent);
    if (contentHashes.includes(messageHash)) {
      console.log('Skipping duplicate content');
      return null;
    }
    
    // Skip low-context messages
    if (isLowContext(textContent)) {
      console.log('Skipping low-context message');
      return null;
    }
    
    // Check if it's a profitable product if in sale mode
    const IS_SALE_MODE = process.env.IS_SALE_MODE === 'true';
    if (IS_SALE_MODE && !isProfitableProduct(textContent)) {
      console.log('Skipping non-profitable product in sale mode');
      return null;
    }
    
    // Process the message (using your core logic)
    const CleanedText = replaceLinksAndText(textContent);
    
    // Extract link from text
    const link = extractLinks(CleanedText);
    
    // Generate normalized message and category using Gemini API (with retry mechanism and fallback)
    let normalizedText = CleanedText;
    let category = 'miscellaneous';
    
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms
    let lastError = null;
    
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await GenerateCaptionAndCategory(CleanedText);
        
        // Check if we got valid results
        if (result.normalizedMessage && result.category) {
          normalizedText = result.normalizedMessage;
          category = result.category;
          if (attempt > 0) {
            console.log(`✅ Successfully generated caption and category using Gemini API (after ${attempt} retry/retries)`);
          } else {
            console.log('✅ Successfully generated caption and category using Gemini API');
          }
          break; // Success, exit retry loop
        } else {
          // Invalid response, use fallback
          console.warn('Gemini API returned incomplete data, using fallback');
          category = detectCategory(CleanedText);
          normalizedText = CleanedText;
          break;
        }
      } catch (error) {
        lastError = error;
        const isRetryableError = 
          error.status === 503 || 
          error.statusCode === 503 ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('503') ||
          error.message?.includes('Service Unavailable') ||
          error.message?.includes('timeout');
        
        if (isRetryableError && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.warn(
            `⚠️ Gemini API error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error.message}. Retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        } else {
          // Non-retryable error or max retries reached
          if (attempt >= MAX_RETRIES) {
            console.error(
              `❌ Failed to generate caption/category with Gemini API after ${MAX_RETRIES + 1} attempts. Using fallback. Last error: ${error.message}`
            );
          } else {
            console.error(`❌ Non-retryable error from Gemini API: ${error.message}. Using fallback.`);
          }
          // Fallback to original method
          category = detectCategory(CleanedText);
          normalizedText = CleanedText;
          break; // Exit retry loop
        }
      }
    }
    
    // Image handling logic
    let imageUrl = null;
    let telegramFileId = null;
    let imageHash = null;

    // Check if message has Amazon links
    if (hasAmazonLinks(CleanedText)) {
      // console.log('Message contains Amazon links, attempting to fetch product image via API');
      const amazonUrls = extractAmazonUrls(CleanedText);
      async function isValidImageUrl(url) {
        try {
          const res = await fetch(url, {
            method: 'HEAD',
            timeout: 5000,
          });

          const contentType = res.headers.get("Content-Type") || res.headers.get("content-type");

          // Ensure it's an image content type (jpeg, png, webp, etc.)
          return res.ok && contentType && contentType.startsWith("image/");
        } catch (err) {
          console.warn("Error validating image URL:", err.message);
          return false;
        }
      }
      if (amazonUrls.length > 0) {
        try {
          // Implement rate limiting before API call
          await waitForApiRateLimit();
          
          const result = await fetchProductImage(amazonUrls[amazonUrls.length - 1]);
          if (result.success && result.imageUrl) {
            const isValid = await isValidImageUrl(result.imageUrl);
            if (isValid) {
              imageUrl = result.imageUrl;
              imageHash = hashString(imageUrl);

              if (imageUrlHashes.includes(imageHash)) {
                console.log('⚠️ Skipping message due to duplicate Amazon image URL');
                return null;
              }

              imageUrlHashes.push(imageHash);
              if (imageUrlHashes.length > 10) imageUrlHashes.shift();

            } else {
              console.log('Fetched image URL is invalid or not accessible. Falling back to Telegram image.');
            if (photo && photo.length > 0) {
            // Handle Telegram direct images - KEEP THIS LOGIC
            console.log('Message contains Telegram photo, extracting file ID');
            const highestQualityPhoto = getHighestQualityPhoto(photo);
            
            if (highestQualityPhoto) {
              telegramFileId = highestQualityPhoto.file_id;
              console.log('Extracted Telegram file ID:', telegramFileId);
            }
          }
            }
          }
          if(!result.success && !result.imageUrl) {
            console.log('Failed to fetch Amazon image via API:', result.error);
            console.log('Falling back to Telegram image');
            if (photo && photo.length > 0) {
            // Handle Telegram direct images - KEEP THIS LOGIC
            console.log('Message contains Telegram photo, extracting file ID');
            const highestQualityPhoto = getHighestQualityPhoto(photo);
            
            if (highestQualityPhoto) {
              telegramFileId = highestQualityPhoto.file_id;
              console.log('Extracted Telegram file ID:', telegramFileId);
            }
          }
          }
        } catch (error) {
          console.error('Error fetching Amazon product image via API & using fallback Telegram image function :', error);
        }
      }
    } else if (photo && photo.length > 0) {
      // Handle Telegram direct images - KEEP THIS LOGIC
      console.log('Message contains Telegram photo, extracting file ID');
      const highestQualityPhoto = getHighestQualityPhoto(photo);
      
      if (highestQualityPhoto) {
        telegramFileId = highestQualityPhoto.file_id;
        console.log('Extracted Telegram file ID:', telegramFileId);
      }
    }
    
    // Add hash to processed list
    contentHashes.push(messageHash);
    if (contentHashes.length > 50) contentHashes.shift(); // Limit stored hashes to save memory
    
    // Create and save new message
    const newMessage = new TelegramMessage({
      messageId: message_id.toString(),
      text: normalizedText, // Use the normalized text from Gemini (or fallback to CleanedText)
      date: new Date(date * 1000), // Convert Unix timestamp to Date
      link,
      imageUrl,
      telegramFileId,
      category,
      clicks: 0,
      channelId
    });
    
    console.log('Saving new message with category:', category, 'and image data:', { imageUrl, telegramFileId });
    return await newMessage.save();
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Get messages with pagination
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated messages
 */
async function getMessages(options = {}) {
  const { limit = 10, cursor, channelId, category, search } = options;
  
  let query = {};
  if (channelId) {
    query.channelId = channelId;
  }
  
  if (cursor) {
    query._id = { $lt: cursor };
  }
  
  if (category) {
    query.category = category;
  }
  
  if (search) {
    const rawSearch = search.trim();
  
    // Split search into words (e.g. "32 inch" → ["32", "inch"])
    const words = rawSearch.split(/\s+/);
  
    // Normalize plural units to singular (e.g. "inches" → "inch")
    const normalizeWord = (word) => {
      const lc = word.toLowerCase();
      const stems = {
        inches: 'inch',
        cms: 'cm',
        kgs: 'kg',
        lbs: 'lb',
        tons: 'ton',
        hz: 'hz', // already singular
        gbs: 'gb',
      };
      return stems[lc] || word;
    };
  
    const normalizedWords = words.map(normalizeWord);
  
    // Define which terms are considered "units" and can use relaxed (substring) match
    const unitWords = ['cm', 'inch', 'kg', 'gb', 'hz', 'tb', 'ton', 'lb'];
  
    // Build regex filters for each word
    const regexQueries = normalizedWords.map(word => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape special regex chars
  
      const isLooseMatch =
        /^\d+$/.test(word) ||            // Pure numbers like "32", "55"
        unitWords.includes(word.toLowerCase()); // Known units like "inch", "cm"
  
      const pattern = isLooseMatch
        ? escapedWord                     // relaxed match: "32" matches "32inch"
        : `\\b${escapedWord}\\b`;         // strict match: "TV" won't match "tvstand"
  
      const wordRegex = new RegExp(pattern, 'i'); // case-insensitive
  
      return { text: { $regex: wordRegex } }; // MongoDB partial match condition
    });
  
    // Exclude results where the **full search string** appears only inside a URL
    const escapedFullSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const urlExclusionRegex = new RegExp(
      `(https?:\\/\\/\\S*${escapedFullSearch}\\S*)|(www\\.\\S*${escapedFullSearch}\\S*)`,
      'i'
    );
  
    // Final query combines all word regexes + URL exclusion
    query.$and = [
      ...regexQueries,
      {
        text: {
          $not: { $regex: urlExclusionRegex }
        }
      }
    ];
  }
  
  
  
   // 🆕 Fetch count and messages together using Promise.all
  const [totalDealsCount, messages] = await Promise.all([
    TelegramMessage.countDocuments(query),
    TelegramMessage.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .lean()
  ]);
  
  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;
  
  // Add MongoDB _id to id field for frontend compatibility
  const processedData = data.map(item => ({
    ...item,
    id: item._id.toString(), // Ensure id field exists for frontend
  }));
  
  return {
    data: processedData,
    hasMore,
    nextCursor: hasMore && data.length > 0 ? data[data.length - 1]._id : null,
    totalDealsCount,
  };
}

// Helper function for click tracking logic
const {redis} = require('../services/redisClient');
/**
 * Handle click tracking using Redis (deferred write to MongoDB)
 */
async function handleClickTracking(req, res) {
  const messageId = req.params.id;

  if (!messageId) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  const redisClickKey = `clicks:msg:${messageId}`;
  const istDate = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  istDate.setHours(0, 0, 0, 0);
  const dailyKey = `clicks:daily:${istDate.toISOString().slice(0, 10)}`; // e.g. clicks:daily:2025-06-22

  try {
    // Increment per-message and daily click count in Redis
    const updatedClickCount = await redis.incr(redisClickKey);
    await redis.incr(dailyKey);

    console.log(`🟢 Redis click count updated for message ${messageId} → ${updatedClickCount}`);

    res.json({ success: true, clicks: updatedClickCount });
  } catch (error) {
    console.error('Redis click tracking error:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
}

/**
 * Legacy fallback (no longer used directly, included for Mongo flush scripts)
 * In production, click counts will be flushed from Redis to Mongo using a scheduled job.
 */
async function incrementClicks(messageId) {
  if (!messageId) {
    console.error('Cannot increment clicks: message ID is missing');
    return null;
  }

  try {
    const updatedMessage = await TelegramMessage.findByIdAndUpdate(
      messageId,
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!updatedMessage) {
      console.log(`No message found with ID: ${messageId} for click tracking`);
    } else {
      console.log(`✅ Mongo updated for ${messageId}: ${updatedMessage.clicks} clicks`);
    }

    return updatedMessage;
  } catch (error) {
    console.error(`Error incrementing clicks for message ${messageId}:`, error);
    return null;
  }
}

module.exports = {
  saveMessage,
  getMessages,
  calculateHash,
  normalizeMessage,
  isRecentMessage,
  isLowContext,
  isProfitableProduct,
  replaceLinksAndText,
  detectCategory,
  incrementClicks, // keep for future use by flush script
  handleClickTracking
};
