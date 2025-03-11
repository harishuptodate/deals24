
const crypto = require('crypto');
const axios = require('axios');

// Check if Amazon PA API is configured
const isApiConfigured = () => {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  const region = process.env.AMAZON_REGION || 'us';
  
  return Boolean(accessKey && secretKey && partnerTag);
};

// Extract ASIN from Amazon URL
const extractAsinFromUrl = (url) => {
  try {
    // Add any special URL patterns here
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/asin\/([A-Z0-9]{10})/i,
      /\/exec\/obidos\/tg\/detail\/-\/([A-Z0-9]{10})/i,
      /\/gp\/product\/gl\/([A-Z0-9]{10})/i,
      /\/([A-Z0-9]{10})(?:\/|\?|$)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting ASIN from URL:', error);
    return null;
  }
};

// Generate Amazon PA API request
const generateRequest = (asin) => {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  const region = process.env.AMAZON_REGION || 'us';
  
  if (!accessKey || !secretKey || !partnerTag) {
    console.error('Amazon PA API credentials are not configured');
    return null;
  }
  
  // Map regions to their corresponding host
  const regionHostMap = {
    us: 'webservices.amazon.com',
    ca: 'webservices.amazon.ca',
    fr: 'webservices.amazon.fr',
    de: 'webservices.amazon.de',
    uk: 'webservices.amazon.co.uk',
    it: 'webservices.amazon.it',
    jp: 'webservices.amazon.co.jp',
    in: 'webservices.amazon.in',
  };
  
  const host = regionHostMap[region.toLowerCase()] || regionHostMap.us;
  const path = '/paapi5/getitems';
  
  // Common parameters required for the request
  const payload = {
    "ItemIds": [asin],
    "Resources": [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price"
    ],
    "PartnerTag": partnerTag,
    "PartnerType": "Associates",
    "Marketplace": "www.amazon.com"
  };
  
  return { host, path, payload, accessKey, secretKey };
};

// Create signature for Amazon PA API
const createSignature = (host, path, payload, accessKey, secretKey) => {
  const algorithm = 'AWS4-HMAC-SHA256';
  const service = 'ProductAdvertisingAPI';
  const region = process.env.AMAZON_REGION || 'us-east-1';
  
  const date = new Date();
  const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
  const amzDate = dateString + 'T' + date.toTimeString().substr(0, 8).replace(/:/g, '') + 'Z';
  
  // Step 1: Create a canonical request
  const contentType = 'application/json; charset=utf-8';
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  
  const canonicalRequest = [
    'POST',
    path,
    '',
    'host:' + host,
    'x-amz-date:' + amzDate,
    'x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
    '',
    'host;x-amz-date;x-amz-target',
    payloadHash
  ].join('\n');
  
  // Step 2: Create the string to sign
  const credentialScope = dateString + '/' + region + '/' + service + '/aws4_request';
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  // Step 3: Calculate the signature
  const signingKey = getSignatureKey(secretKey, dateString, region, service);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');
  
  // Step 4: Create the Authorization header
  const authorization = [
    algorithm + ' Credential=' + accessKey + '/' + credentialScope,
    'SignedHeaders=host;x-amz-date;x-amz-target',
    'Signature=' + signature
  ].join(', ');
  
  return {
    headers: {
      'content-type': contentType,
      'x-amz-date': amzDate,
      'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
      'authorization': authorization
    }
  };
};

// Helper function for signature key generation
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = crypto
    .createHmac('sha256', 'AWS4' + key)
    .update(dateStamp)
    .digest();
  
  const kRegion = crypto
    .createHmac('sha256', kDate)
    .update(regionName)
    .digest();
  
  const kService = crypto
    .createHmac('sha256', kRegion)
    .update(serviceName)
    .digest();
  
  const kSigning = crypto
    .createHmac('sha256', kService)
    .update('aws4_request')
    .digest();
  
  return kSigning;
}

// Get product image URL from Amazon
const getProductImageUrl = async (asin) => {
  try {
    if (!isApiConfigured()) {
      console.error('Amazon PA API credentials are not configured');
      return null;
    }
    
    console.log(`Getting image URL for ASIN: ${asin}`);
    
    const requestData = generateRequest(asin);
    
    if (!requestData) {
      return null;
    }
    
    const { host, path, payload, accessKey, secretKey } = requestData;
    const signature = createSignature(host, path, payload, accessKey, secretKey);
    
    const url = `https://${host}${path}`;
    
    const response = await axios.post(url, payload, {
      headers: signature.headers
    });
    
    if (response.data && 
        response.data.ItemsResult && 
        response.data.ItemsResult.Items && 
        response.data.ItemsResult.Items.length > 0 &&
        response.data.ItemsResult.Items[0].Images &&
        response.data.ItemsResult.Items[0].Images.Primary &&
        response.data.ItemsResult.Items[0].Images.Primary.Large &&
        response.data.ItemsResult.Items[0].Images.Primary.Large.URL) {
      
      return response.data.ItemsResult.Items[0].Images.Primary.Large.URL;
    }
    
    // Fallback: If API fails, try to construct an Amazon image URL (this may not always work)
    return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
    
  } catch (error) {
    console.error('Error getting Amazon product image:', error.message);
    
    // Log more detailed error information
    if (error.response) {
      console.error('Amazon API error response:', error.response.data);
    }
    
    // Fallback: If API call fails, return a constructed Amazon image URL
    return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
  }
};

// Get detailed product information
const getProductDetails = async (asin) => {
  try {
    if (!isApiConfigured()) {
      console.error('Amazon PA API credentials are not configured');
      return null;
    }
    
    const requestData = generateRequest(asin);
    
    if (!requestData) {
      return null;
    }
    
    const { host, path, payload, accessKey, secretKey } = requestData;
    const signature = createSignature(host, path, payload, accessKey, secretKey);
    
    const url = `https://${host}${path}`;
    
    const response = await axios.post(url, payload, {
      headers: signature.headers
    });
    
    if (response.data && 
        response.data.ItemsResult && 
        response.data.ItemsResult.Items && 
        response.data.ItemsResult.Items.length > 0) {
      
      return response.data.ItemsResult.Items[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting Amazon product details:', error.message);
    return null;
  }
};

module.exports = {
  isApiConfigured,
  extractAsinFromUrl,
  getProductImageUrl,
  getProductDetails
};
