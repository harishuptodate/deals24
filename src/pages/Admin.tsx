
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription,
	CardFooter,
} from '@/components/ui/card';
import {
	ResponsiveContainer,
	LineChart,
	XAxis,
	YAxis,
	Tooltip,
	Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { getClickAnalytics, getTopPerformingDeals } from '../services/api';
import { TelegramMessage } from '../types/telegram';
import { ChartTooltip } from '@/components/ui/chart';

interface ClickData {
	name: string;
	clicks: number;
}

const Admin = () => {
	const [activeTab, setActiveTab] = useState('day');
	const [clicksData, setClicksData] = useState<ClickData[]>([]);
	const [totalClicks, setTotalClicks] = useState(0);
	const [totalMessages, setTotalMessages] = useState(0);
	const [topDeals, setTopDeals] = useState<TelegramMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchClickAnalytics = async () => {
			setIsLoading(true);
			try {
				const data = await getClickAnalytics(activeTab);
				if (data && data.clicksData) {
					setClicksData(data.clicksData);
					setTotalClicks(data.totalClicks || 0);
					setTotalMessages(data.totalMessages || 0);
				}
				
				const topDealsData = await getTopPerformingDeals(5);
				setTopDeals(topDealsData);
			} catch (error) {
				console.error('Failed to load analytics data:', error);
				// Set fallback data if API fails
				setClicksData([
					{ name: 'Monday', clicks: 0 },
					{ name: 'Tuesday', clicks: 0 },
					{ name: 'Wednesday', clicks: 0 },
					{ name: 'Thursday', clicks: 0 },
					{ name: 'Friday', clicks: 0 },
					{ name: 'Saturday', clicks: 0 },
					{ name: 'Sunday', clicks: 0 },
				]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchClickAnalytics();
	}, [activeTab]);

	const renderTopDeals = () => {
		if (isLoading) {
			return (
				<div className="text-center py-4 text-muted-foreground">
					Loading top deals...
				</div>
			);
		}

		if (!topDeals || topDeals.length === 0) {
			return (
				<div className="text-center py-8 text-muted-foreground">
					No click data available
				</div>
			);
		}

		// Create a Map to ensure uniqueness by ID
		const uniqueDeals = new Map();
		topDeals.forEach(deal => {
			if (!uniqueDeals.has(deal.id)) {
				uniqueDeals.set(deal.id, deal);
			}
		});

		return (
			<div className="space-y-4">
				{Array.from(uniqueDeals.values()).map((deal) => (
					<div key={deal.id} className="flex items-center justify-between p-2 border-b">
						<div className="flex-1">
							<p className="font-medium truncate">{deal.text?.substring(0, 50)}...</p>
							<p className="text-sm text-muted-foreground">Clicks: {deal.clicks || 0}</p>
						</div>
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-white">
			<Navbar />
			<main className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gradient">Analytics Dashboard</h1>
					<p className="text-gray-600 mt-2">
						Monitor your automated deal posting service
					</p>
				</div>

				{/* Stats Overview */}
				<div className="grid grid-cols-1 sm:grid-cols-1 gap-6 mb-8">
					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col">
								<span className="text-sm text-muted-foreground">Total Messages</span>
								<div className="flex items-baseline justify-between">
									<span className="text-3xl font-bold">{totalMessages}</span>
									<span className="text-sm font-medium text-green-500">All time</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Click Analytics</CardTitle>
							<div className="flex space-x-2 mt-2">
								<Button
									variant={activeTab === 'day' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setActiveTab('day')}
									className="text-xs h-8 px-3">
									Day
								</Button>
								<Button
									variant={activeTab === 'week' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setActiveTab('week')}
									className="text-xs h-8 px-3">
									Week
								</Button>
								<Button
									variant={activeTab === 'month' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setActiveTab('month')}
									className="text-xs h-8 px-3">
									Month
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<div className="h-[300px]">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart
										data={clicksData}
										margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
										<XAxis dataKey="name" />
										<YAxis />
										<Tooltip formatter={(value) => `${value} clicks`} />
										<Line
											type="monotone"
											dataKey="clicks"
											stroke="#8884d8"
											strokeWidth={2}
											activeDot={{ r: 8 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
							<div className="px-6 py-4 text-center text-muted-foreground text-sm">
								{isLoading ? 'Loading data...' : `Total clicks: ${totalClicks} in selected period`}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Top Performing Deals</CardTitle>
							<CardDescription>
								Most clicked deals in selected period
							</CardDescription>
						</CardHeader>
						<CardContent>
							{renderTopDeals()}
						</CardContent>
						<CardFooter className="border-t px-6 py-4">
							<Button variant="outline" className="w-full">
								View All Analytics
							</Button>
						</CardFooter>
					</Card>
				</div>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Click-Through Rate
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{totalMessages > 0 ? ((totalClicks / totalMessages) * 100).toFixed(1) : '0.0'}%
						</div>
						<p className="text-xs text-muted-foreground">
							Based on clicks vs. total messages
						</p>
					</CardContent>
				</Card>
			</main>
		</div>
	);
};

export default Admin;
