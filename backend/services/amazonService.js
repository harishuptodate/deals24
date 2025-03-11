
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// Amazon PA API credentials from environment variables
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG;
const AMAZON_REGION = process.env.AMAZON_REGION || 'us';

// API endpoint based on region
const getApiEndpoint = (region) => {
  const endpoints = {
    'us': 'webservices.amazon.com',
    'ca': 'webservices.amazon.ca',
    'uk': 'webservices.amazon.co.uk',
    'de': 'webservices.amazon.de',
    'fr': 'webservices.amazon.fr',
    'in': 'webservices.amazon.in',
    // Add more regions as needed
  };
  
  return endpoints[region] || endpoints['us'];
};

// Generate request signature for Amazon PA API
const generateSignature = (requestPath, params, timestamp, secretKey) => {
  const stringToSign = [
    'GET',
    getApiEndpoint(AMAZON_REGION),
    requestPath,
    Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
  ].join('\n');

  return crypto
    .createHmac('sha256', secretKey)
    .update(stringToSign)
    .digest('base64');
};

// Extract ASIN from Amazon product URL
const extractAsin = (url) => {
  if (!url || !url.includes('amazon')) return null;
  
  // Try to extract ASIN from URL using various patterns
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/exec\/obidos\/asin\/([A-Z0-9]{10})/i,
    /\/exec\/obidos\/tg\/detail\/-\/([A-Z0-9]{10})/i,
    /\/.*ASIN\/([A-Z0-9]{10})/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
};

// Fetch product details from Amazon PA API
const getProductDetails = async (asin) => {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    console.error('Amazon PA API credentials are not configured');
    return null;
  }
  
  if (!asin) {
    console.error('Invalid ASIN');
    return null;
  }
  
  try {
    const endpoint = getApiEndpoint(AMAZON_REGION);
    const requestPath = '/paapi5/getitems';
    const timestamp = new Date().toISOString();
    
    const params = {
      'Action': 'GetItems',
      'AWSAccessKeyId': AMAZON_ACCESS_KEY,
      'AssociateTag': AMAZON_PARTNER_TAG,
      'ItemId': asin,
      'Operation': 'GetItems',
      'ResponseGroup': 'Images,ItemAttributes,Offers',
      'Service': 'AWSECommerceService',
      'Timestamp': timestamp,
      'Version': '2013-08-01'
    };
    
    const signature = generateSignature(requestPath, params, timestamp, AMAZON_SECRET_KEY);
    params.Signature = signature;
    
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = `https://${endpoint}${requestPath}?${queryString}`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.Items && response.data.Items.Item) {
      const item = response.data.Items.Item[0];
      return {
        title: item.ItemAttributes?.Title,
        imageUrl: item.LargeImage?.URL || item.MediumImage?.URL || item.SmallImage?.URL,
        price: item.Offers?.Offer?.[0]?.OfferListing?.Price?.FormattedPrice,
        url: item.DetailPageURL
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching product details from Amazon PA API:', error);
    return null;
  }
};

// Get product image URL from Amazon PA API
const getProductImageUrl = async (url) => {
  const asin = extractAsin(url);
  if (!asin) return null;
  
  const productDetails = await getProductDetails(asin);
  return productDetails?.imageUrl || null;
};

module.exports = {
  getProductDetails,
  getProductImageUrl,
  extractAsin
};
