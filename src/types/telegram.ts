
export interface TelegramMessage {
  id: string;
  text: string;
  date: string;
  link?: string;
  imageUrl?: string;
}

export interface ApiResponse {
  data: TelegramMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

// Add the missing TelegramResponse interface
export interface TelegramResponse {
  data: TelegramMessage[];
  hasMore: boolean;
  nextCursor?: string;
}
