
export interface TelegramMessage {
	id: string;
	_id?: string; // MongoDB ID field
	text: string;
	date: string;
	link?: string;
	imageUrl?: string;
	telegramFileId?: string;
	category?: string;
	price?: string;
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

export interface ClickDataPoint {
	name: string;
	clicks: number;
	date?: string;
	week?: number;
	year?: number;
	month?: number;
}

export interface ClickAnalyticsResponse {
	clicksData: Array<{
		name: string;
		clicks: number;
	}>;
	totalClicks: number;
	totalMessages: number;
	totalMonth: number;
	totalYear: number;
	period?: 'day' | 'week' | 'month';
}

export interface ClickStatsResponse {
	daily: ClickDataPoint[];
	weekly: ClickDataPoint[];
	monthly: ClickDataPoint[];
	yearly: ClickDataPoint[];
	totalClicks: number;
	totalMonthClicks: number;
	totalYearClicks: number;
	last7Days: ClickDataPoint[];
}
