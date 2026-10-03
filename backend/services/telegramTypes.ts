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
  amazonUrl: string | null;
};

export type GeneratedMessageContent = {
  normalizedText: string;
  category: string;
  price: string;
  identity?: ProductIdentity;
  match?: ProductMatch;
  usedFallback?: boolean;
};

export type ProductIdentity = {
  canonicalName: string;
  brand: string;
  model: string;
  productType: string;
  variant: string[];
};

export type ProductMatch = {
  candidateId: string | null;
  sameProduct: boolean;
  confidence: number;
  reason: string;
};

export type ProductMatchCandidate = {
  id: string;
  text: string;
  category?: string;
  identity?: Partial<ProductIdentity>;
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
