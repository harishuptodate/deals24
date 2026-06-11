export type TelegramPhoto = {
  file_id?: string;
  file_size?: number;
};

export type TelegramInboundMessage = {
  message_id: number | string;
  chat: { id: number | string };
  date: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhoto[] | null;
};

export type ResolvedImageData = {
  imageUrl: string | null;
  telegramFileId: string | null;
};

export type GeneratedMessageContent = {
  normalizedText: string;
  category: string;
  price: string;
};

export type MessageQueryOptions = {
  limit?: number | string;
  cursor?: string;
  channelId?: string;
  category?: string;
  search?: string;
  from?: string;
  to?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
};
