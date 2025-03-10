
import React, { useState } from 'react';
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

// Dummy data for demonstration
const clicksData = [
	{ name: 'Monday', clicks: 120 },
	{ name: 'Tuesday', clicks: 200 },
	{ name: 'Wednesday', clicks: 150 },
	{ name: 'Thursday', clicks: 80 },
	{ name: 'Friday', clicks: 110 },
	{ name: 'Saturday', clicks: 90 },
	{ name: 'Sunday', clicks: 130 },
];

const Admin = () => {
	const [activeTab, setActiveTab] = useState('day');

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
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col">
								<span className="text-sm text-muted-foreground">Total Messages</span>
								<div className="flex items-baseline justify-between">
									<span className="text-3xl font-bold">1,234</span>
									<span className="text-sm font-medium text-green-500">+12%</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col">
								<span className="text-sm text-muted-foreground">Tweets Posted</span>
								<div className="flex items-baseline justify-between">
									<span className="text-3xl font-bold">987</span>
									<span className="text-sm font-medium text-green-500">+8%</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col">
								<span className="text-sm text-muted-foreground">Failed Posts</span>
								<div className="flex items-baseline justify-between">
									<span className="text-3xl font-bold">23</span>
									<span className="text-sm font-medium text-red-500">-5%</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="pt-6">
							<div className="flex flex-col">
								<span className="text-sm text-muted-foreground">Deal Clicks</span>
								<div className="flex items-baseline justify-between">
									<span className="text-3xl font-bold">0</span>
									<span className="text-sm font-medium text-green-500">Last day</span>
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
								{activeTab === 'day' && 'Total clicks: 0 in selected period'}
								{activeTab === 'week' && 'No click data available for the selected period'}
								{activeTab === 'month' && 'No click data available for the selected period'}
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
							<div className="text-center py-8 text-muted-foreground">
								No click data available
							</div>
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
						<div className="text-2xl font-bold">49.3%</div>
						<p className="text-xs text-muted-foreground">
							+4.1% from last month
						</p>
					</CardContent>
				</Card>
			</main>
		</div>
	);
};

export default Admin;
