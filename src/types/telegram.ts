
export interface TelegramMessage {
  id: string;
  text: string;
  date: string;
  link?: string;
  imageUrl?: string;
  category?: string;
}

export interface ApiResponse {
  data: TelegramMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface TelegramResponse {
  data: TelegramMessage[];
  hasMore: boolean;
  nextCursor?: string;
}
