export const buildCaptionPrompt = (messageText: string): string => `You are a product deal message processor. Analyze the following product deal message and understand the intent properly from the below instructions and examples and perform these tasks:

1. Normalize the message: Remove ALL promotional noise, unnecessary text, and keep ONLY essential product information. Specifically:

REMOVE these types of promotional text:
- Promotional words/phrases: "mahaa looot🚀", "loot🚀", "mahaa", "looot", "Lowest⚡️", "FLAT X OFF", "Sale Ends Today", "[Back]", etc.
- Promotional emojis: 🚀, 🔥, 🤩, ⚡️, etc. (keep only essential ones like 🔗 for links)
- Promotional phrases: "check review in our channel", "highly recommended", "its full hd tv" (when redundant), "Very Premium Brand", etc.
- Hashtags: #Deals24, #AnyHashtag, etc.
- Redundant promotional text that doesn't add product value

KEEP these:
- Product name and specifications (model, size, features, etc.)
- Price information (₹X,XXX format)
- Product links (Amazon URLs, etc.)
- Essential deal information (discounts, coupon codes, bank offers)
- Essential emojis for structure (🔗 for links, ❌ for regular price, 💡 for offers)

Do not touch or remove the links. Keep the message clean and professional. Do not add any other text or formatting.

Few examples:
Example 1:
Message:
"Looot🚀🚀ZEBRONICS Juke Bar 700 5.1 Dolby Audio @ ₹8,999

🔗https://fkrt.site/BfxXuEU

❌Regular price @ ₹15,999

💡Flat ₹1,000 off with HDFC CC"

Normalized message:
"ZEBRONICS Juke Bar 700 5.1 Dolby Audio @ ₹8,999

🔗https://fkrt.site/BfxXuEU

❌Regular price @ ₹15,999

💡Flat ₹1,000 off with HDFC CC"

Example 2:
Message:
"Flast 10K off🔥Mahaa laptop loot @ 53K

ASUS TUF Gaming A15, AMD Ryzen 7 7435HS Gaming Laptop(NVIDIA RTX 3050-4GB/60W TGP/16GB RAM/512GB

🔗https://www.amazon.in/dp/B0D5DFR78J/ref=cm_sw_r_as_gl_api_gl_i_dl_5N6TRF3366E5QGKNYRXB?linkCode=ml1&linkId=32ba368a4ce329e7c99e34aed8bdfec0&tag=harishch-21"

Normalized message:
"ASUS TUF Gaming A15, AMD Ryzen 7 7435HS Gaming Laptop(NVIDIA RTX 3050-4GB/60W TGP/16GB RAM/512GB @ 53K

🔗https://www.amazon.in/dp/B0D5DFR78J/ref=cm_sw_r_as_gl_api_gl_i_dl_5N6TRF3366E5QGKNYRXB?linkCode=ml1&linkId=32ba368a4ce329e7c99e34aed8bdfec0&tag=harishch-21"

Example 3:
Message:
"[Back] FLAT 13K OFF 🤩Mahaa Side by Side Refrigerator Loot🔥

Lowest⚡️Haier 602 L, 3 Star, Expert Inverter, Frost Free Side by Side Refrigerator @ ₹50,240

🔗www.amazon.in

❌ Regular price @ ₹62,990

💡 Apply ₹2000 Off Coupon + Flat ₹9,750 Off With SBI/ICICI Cc"

Normalized message:
"Haier 602 L, 3 Star, Expert Inverter, Frost Free Side by Side Refrigerator @ ₹50,240

🔗https://www.amazon.in/dp/B0B8ZMLRH4?th=1&linkCode=sl1&linkId=9cfcffe1bb058c61d34512f82b9b77d8&language=en_IN&ref_=as_li_ss_tl&tag=harishch-21

❌ Regular price @ ₹62,990

💡 Apply ₹2000 Off Coupon + Flat ₹9,750 Off With SBI/ICICI CC"

Example 4:
Message:
"[‼️Sale Ends Today] 

Mahaa AC Looot🚀🚀40K AC @ 34K 🤩 

Daikin 1.5 Ton 3 Star Inverter Split AC

🔗https://amzn.to/4jRElqG

💡 Flat ₹3,250 Off With HDFC Cc

✅ Daikin Very Premium Brand"

Normalized message:
"Daikin 1.5 Ton 3 Star Inverter Split AC @ 34K

🔗https://amzn.to/4jRElqG

💡 Flat ₹3,250 Off With HDFC CC"

2. Identify the category: Based on the product described, classify it into ONE of these exact categories:
   - laptops
   - electronics-home
   - mobile-phones
   - gadgets-accessories
   - fashion
   - miscellaneous

3. Extract the final offer price: Carefully identify the final deal/offer price of the product from the message and return it as a separate field named "price". Make sure the price is not the regular price, it should be the deal price often mentioned with @ symbol. You dont have to do the math applying any discounts/coupons/offers for the effective price, just extract the price as it is. Use only the numeric value without ₹, commas, or extra text. For prices like 53K or 34K, convert them to full numeric value like "53000" or "34000". If no price is clearly available, return an empty string.

Important Note: Extract the lowest deal price from the message if it has multiple product deals.


Example for multiple product deals Message: 
"Festive Deals Ends Tonight ‼️

Best 32 Inch TV's In 2025  | Telugu Tech TV hand Picked ✅

1️⃣ Xiaomi F Series HD Ready Smart LED Fire TV @ ₹8,999
🔗https://amzn.to/42TZyJY

2️⃣ Samsung HD Smart LED TV @ ₹11,740
🔗https://amzn.to/3J2EY3v

3️⃣ TCL V5C Series Full HD Smart QLED Google TV @ ₹11,241
🔗https://amzn.to/4hqHiOd

💡 All The Above Mentioned Prices With HDFC Cc Discounts"

Normalized message:
"Best 32 Inch TV's In 2025  | Deals24 hand Picked ✅

1️⃣ Xiaomi F Series HD Ready Smart LED Fire TV @ ₹8,999
🔗https://amzn.to/42TZyJY

2️⃣ Samsung HD Smart LED TV @ ₹11,740
🔗https://amzn.to/3J2EY3v

3️⃣ TCL V5C Series Full HD Smart QLED Google TV @ ₹11,241
🔗https://amzn.to/4hqHiOd

💡 All The Above Mentioned Prices With HDFC Cc Discounts"

CRITICAL: Return ONLY valid JSON. Do NOT use markdown code blocks (no triple backticks with json or without). Do NOT add any explanations, text, or formatting before or after the JSON. Start directly with { and end with }. Return pure JSON only.

Example of correct response format:
{"normalizedMessage": "Product name @ ₹Price", "category": "electronics-home", "price": "53000"}

Message to process:
${messageText}`
