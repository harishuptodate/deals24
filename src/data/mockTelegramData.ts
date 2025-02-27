
import { TelegramMessage } from '../types/telegram';

// Sample mock data for development and fallback purposes
export const mockTelegramMessages: TelegramMessage[] = [
  {
    id: '1',
    text: 'iPhone 15 Pro - Limited Time Deal\nGet $200 off on the latest iPhone 15 Pro. Available in all colors. Free delivery included!\n#Apple #iPhone #Deal',
    date: new Date().toISOString(),
    link: 'https://example.com/iphone-deal',
    imageUrl: 'https://placeholder.com/iphone15'
  },
  {
    id: '2',
    text: 'Samsung Galaxy Watch 6 - Flash Sale\n40% discount on Samsung Galaxy Watch 6. Limited stock available. Order now!\n#Samsung #Wearables #Sale',
    date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    link: 'https://example.com/galaxy-watch',
  },
  {
    id: '3',
    text: 'MacBook Air M2 - Student Discount\nSpecial pricing for students on MacBook Air with M2 chip. Valid student ID required.\n#Apple #MacBook #StudentOffer',
    date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    link: 'https://example.com/macbook-student',
  },
  {
    id: '4',
    text: 'Sony WH-1000XM5 Headphones\nBest-in-class noise cancellation headphones now with 25% discount. Free shipping worldwide!\n#Sony #Headphones #Deal',
    date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    link: 'https://example.com/sony-headphones',
  },
  {
    id: '5',
    text: 'Nintendo Switch OLED Bundle\nGet Nintendo Switch OLED with 2 games and extra controller at 15% off. Limited time offer!\n#Nintendo #Gaming #Bundle',
    date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    link: 'https://example.com/nintendo-bundle',
  },
  {
    id: '6',
    text: 'iPad Pro 12.9-inch - Weekend Sale\nSave $150 on iPad Pro 12.9-inch with M2 chip. AppleCare+ included free for 1 year.\n#Apple #iPad #WeekendDeal',
    date: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    link: 'https://example.com/ipad-sale',
  },
  {
    id: '7',
    text: 'Bose QuietComfort Earbuds II\nBose QuietComfort Earbuds II at their lowest price ever. Free 2-day shipping!\n#Bose #Earbuds #Deal',
    date: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    link: 'https://example.com/bose-earbuds',
  },
  {
    id: '8',
    text: 'Amazon Echo Show 10 - Special Offer\nGet 30% off on Amazon Echo Show 10. Free smart bulb included with purchase.\n#Amazon #SmartHome #Offer',
    date: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    link: 'https://example.com/echo-show',
  },
  {
    id: '9',
    text: 'Dell XPS 13 Laptop\nPremium ultrabook with 12th Gen Intel processor. Now with $300 discount and extended warranty.\n#Dell #Laptop #Deal',
    date: new Date(Date.now() - 691200000).toISOString(), // 8 days ago
    link: 'https://example.com/dell-xps',
  },
  {
    id: '10',
    text: 'Dyson V12 Detect Slim\nThe latest Dyson cordless vacuum with laser dust detection. 20% off this week only!\n#Dyson #Vacuum #Discount',
    date: new Date(Date.now() - 777600000).toISOString(), // 9 days ago
    link: 'https://example.com/dyson-v12',
  },
  {
    id: '11',
    text: 'GoPro HERO11 Black Bundle\nAdventure ready bundle with extra battery, SD card and accessories. Save $100 today.\n#GoPro #Camera #Bundle',
    date: new Date(Date.now() - 864000000).toISOString(), // 10 days ago
    link: 'https://example.com/gopro-bundle',
  },
  {
    id: '12',
    text: 'Samsung 4K QLED TV 65"\nImmersive viewing experience with vibrant colors. Flash sale - 35% off retail price!\n#Samsung #TV #FlashSale',
    date: new Date(Date.now() - 950400000).toISOString(), // 11 days ago
    link: 'https://example.com/samsung-tv',
  }
];
