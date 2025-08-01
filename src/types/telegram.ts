
export interface TelegramMessage {
	id: string;
	_id?: string; // MongoDB ID field
	text: string;
	date: string;
	link?: string;
	imageUrl?: string;
	telegramFileId?: string;
	category?: string;
	clicks?: number;
	createdAt?: string; // Added for compatibility
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
	totalDealsCount?: number;
}

export interface CategoryCount {
	category: string;
	count: number;
}
export interface TopPerformingResponse {
	topMessages: TelegramMessage[];
	totalMessages: number;
}
