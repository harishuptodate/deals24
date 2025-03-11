
/**
 * Utility function to detect the category of a product based on keywords in the message
 * @param {string} text - The message text to analyze
 * @returns {string|null} - The detected category or null if no category detected
 */
exports.detectCategory = (text) => {
  if (!text) return null;
  
  const textLower = text.toLowerCase();
  
  // Category detection based on keywords
  const categories = {
    'electronics-home': [
      'tv', 'television', 'smart tv', '4k', 'uhd', 'led', 'oled', 'qled',
      'speaker', 'soundbar', 'audio', 'headphones', 'earbuds', 'refrigerator', 'fridge',
      'washing machine', 'dishwasher', 'microwave', 'oven', 'air conditioner', 'ac',
      'vacuum', 'smart home', 'alexa', 'echo', 'google home', 'home theater'
    ],
    'laptops': [
      'laptop', 'notebook', 'macbook', 'chromebook', 'gaming laptop', 'ultrabook',
      'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'surface', 'thinkpad'
    ],
    'mobile-phones': [
      'phone', 'smartphone', 'iphone', 'samsung', 'galaxy', 'pixel', 'oneplus',
      'xiaomi', 'redmi', 'oppo', 'vivo', 'realme', 'mobile', 'android',
      'tablet', 'ipad', 'watch', 'smartwatch', 'earphones', 'airpods'
    ],
    'fashion': [
      'shirt', 't-shirt', 'tshirt', 'jeans', 'pants', 'dress', 'shoes', 'sneakers',
      'jacket', 'coat', 'sweater', 'hoodie', 'watch', 'sunglasses', 'handbag',
      'backpack', 'wallet', 'hat', 'cap', 'socks', 'underwear', 'lingerie'
    ]
  };
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      // Check if the keyword is present as a whole word
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(textLower)) {
        return category;
      }
    }
  }
  
  // Secondary check for product types in the message
  if (/\b(deal|sale|discount|offer|save|price|buy|shop)\b/i.test(textLower)) {
    // Default to electronics if it's clearly a deal but category can't be determined
    return 'electronics-home';
  }
  
  return null;
};

/**
 * Gets a list of all supported categories
 * @returns {string[]} Array of category slugs
 */
exports.getAllCategories = () => {
  return [
    'electronics-home',
    'laptops',
    'mobile-phones',
    'fashion'
  ];
};

/**
 * Gets the display name for a category slug
 * @param {string} slug - The category slug
 * @returns {string} The display name
 */
exports.getCategoryName = (slug) => {
  const categoryNames = {
    'electronics-home': 'Electronics & Home',
    'laptops': 'Laptops',
    'mobile-phones': 'Mobile Phones',
    'fashion': 'Fashion'
  };
  
  return categoryNames[slug] || 'Uncategorized';
};

/**
 * Check if a subcategory belongs to a parent category
 * @param {string} subcategory - The subcategory to check
 * @param {string} category - The parent category
 * @returns {boolean} True if subcategory belongs to category
 */
exports.isSubcategoryOf = (subcategory, category) => {
  if (!subcategory || !category) return false;
  
  const subcategoryMap = {
    'electronics-home': [
      'smart tv', '4k tv', 'led tv', 'oled tv', 'soundbar', 'speaker',
      'headphones', 'washing machine', 'refrigerator', 'air conditioner',
      'vacuum cleaner', 'microwave'
    ],
    'laptops': [
      'gaming laptop', 'ultrabook', 'macbook', 'chromebook', 'notebook'
    ],
    'mobile-phones': [
      'iphone', 'samsung galaxy', 'pixel', 'oneplus', 'xiaomi', 'tablet', 'ipad'
    ],
    'fashion': [
      't-shirt', 'jeans', 'shoes', 'watch', 'jacket', 'dress', 'sneakers'
    ]
  };
  
  if (!subcategoryMap[category]) return false;
  
  const subcategoryLower = subcategory.toLowerCase();
  return subcategoryMap[category].some(sub => 
    subcategoryLower.includes(sub.toLowerCase())
  );
};
