/**
 * Detect category based on message content
 * @param {string} text - Message text
 * @returns {string|undefined} - Detected category or undefined
 */
export function detectCategory(text) {
  const categories = {
    "laptops": [
      "laptop", "notebook", "ultrabook", "macbook", "mac", "lenovo", "hp", "dell", "asus", "msi", "razer", "apple macbook", "chromebook", 
      "gaming laptop", "surface", "surface laptop", "thinkpad", "ideapad", 
      "legion", "vivobook", "zenbook", "spectre", "pavilion", "omen", 
      "inspiron", "latitude", "rog", "tuf", "predator", "swift", 
      "helios", "nitro", "blade", "stealth", "probook"
    ],
    "electronics-home": [
      "washing machine", "tv", "television", "smart tv", "4k", "uhd", "led", 
      "oled", "qled", "sofa", "refrigerator", "fridge", "air conditioner", "ac", 
      "microwave", "oven", "toaster", "dishwasher", "water purifier", "home theatre", 
      "home theater", "soundbar", "speaker", "audio", "geyser", "cooler", 
      "vacuum cleaner", "vacuum", "iron", "induction cooktop", "blender", 
      "mixer grinder", "juicer", "coffee maker", "rice cooker", "heater", 
      "fan", "chimney", "deep freezer", "air fryer", "smart home", 
      "alexa", "echo", "google home", "Mattress", "bed", "pillow",
    ],
    "mobile-phones": [
      "iphone", "android", "smartphone", "mobile phone", "5g phone",
      "galaxy", "oppo", "vivo", 
      "realme", "motorola", "nokia", "google pixel", "pixel", "sony xperia", 
      "huawei", "asus rog phone", "infinix", "tecno", "honor", "iqoo", 
      "poco", "foldable phone", "flip phone", "flagship phone", "budget phone", 
      "mid-range phone", "flagship killer", "phone", "mobile", "tablet" 
    ],
    "gadgets-accessories": [
      "power bank", "tws", "earphones", "printer",
      "ipad", "smartwatch", "earphones", "airpods", "earbuds", "headphones", 
      "bluetooth earphones", "neckband", "chargers", "fast charger", 
      "usb charger", "wireless charger", "cable", "usb cable", 
      "type-c cable", "lightning cable", "hdmi cable", "adapter", 
      "moniter", "monitor", "memory card", "sd card", "pendrive", 
      "usb drive", "hdd", "ssd", "laptop bag", "keyboard", "mouse", 
      "gaming mouse", "mouse pad", "cooling pad", "phone case", 
      "screen protector", "smartwatch", "fitness band", "vr headset", 
      "gaming controller"
    ],
    "fashion": [
      "clothing", "t-shirt", "tshirt", "shirt", "jeans", "trousers", 
      "pants", "shorts", "skirt", "dress", "jacket", "blazer", "sweater", 
      "hoodie", "coat", "suit", "ethnic wear", "kurta", "saree", 
      "lehenga", "salwar", "leggings", "innerwear", "nightwear", 
      "sportswear", "shoes", "sneakers", "heels", "sandals", 
      "flip-flops", "boots", "formal shoes", "loafers", "running shoes", 
      "belts", "wallets", "watches", "watch", "sunglasses", "jewelry", 
      "rings", "necklace", "bracelet", "earrings", "bangles", 
      "handbag", "clutch", "backpack", "hat", "cap", "socks", 
      "underwear", "lingerie"
    ],
    "Best-Deals": [
      "ThisThingShouldNotMatchWithAnything"
    ]
  };

  const lowerText = text.toLowerCase();

  for (let category in categories) {
    for (let keyword of categories[category]) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i'); // Ensure proper boundary matching
      if (regex.test(lowerText)) {
        console.log(`Matched category: ${category} with keyword: ${keyword}`); // Log the matched category and keyword
        return category;
      }
    }
  }
  
  return 'miscellaneous'; // Return null if no category matches
}