import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	getTopPerformingDeals,
	deleteProduct,
	updateMessageText,
	updateMessageCategory,
	getAllCategories,
	getClickStats,
} from '../services/api';
import {
	Loader2,
	ArrowUp,
	BarChart3,
	TrendingUp,
	Calendar,
	ExternalLink,
	Tag,
	Lock,
	Package,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { subDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AdminLoginDialog } from '../components/AdminLoginDialog';
import { 
	isAuthenticated, 
	logout, 
	hasEditPermission,
	hasCategoryPermission,
	grantEditPermission,
	grantCategoryPermission,
	verifyActionPassword 
} from '../services/authService';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { handleTrackedLinkClick } from '../services/api';
import { Input } from '@/components/ui/input';
import PerformanceMetricsChart from '../components/admin/PerformanceMetricsChart';
import AvgClicksCard from '@/components/AvgClicksCard';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface ClickData {
	name: string;
	clicks: number;
	date: string;
}

interface StatsData {
	daily: ClickData[];
	weekly: ClickData[];
	monthly: ClickData[];
	yearly: ClickData[];
	totalClicks: number;
	totalMonthClicks: number;
	totalYearClicks: number;
}

const Admin = () => {
	const { toast } = useToast();
	const [clickStats, setClickStats] = useState<StatsData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [activePeriod, setActivePeriod] = useState<
		'day' | 'week' | 'month' | 'year'
	>('day');
	const [topDeals, setTopDeals] = useState<any[]>([]);
	const [selectedDeal, setSelectedDeal] = useState<any>(null);
	const [isLoadingTop, setIsLoadingTop] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditPasswordDialogOpen, setIsEditPasswordDialogOpen] = useState(false);
	const [isCategoryPasswordDialogOpen, setIsCategoryPasswordDialogOpen] = useState(false);
	const [editedText, setEditedText] = useState('');
	const [selectedCategory, setSelectedCategory] = useState('');
	const [availableCategories, setAvailableCategories] = useState<string[]>([]);
	const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
	const [isLoadingCategories, setIsLoadingCategories] = useState(false);
	const [deletePassword, setDeletePassword] = useState('');
	const [deleteError, setDeleteError] = useState('');
	const [editPassword, setEditPassword] = useState('');
	const [categoryPassword, setCategoryPassword] = useState('');
	const [editError, setEditError] = useState('');
	const [categoryError, setCategoryError] = useState('');
	const navigate = useNavigate();
	const [showLoginDialog, setShowLoginDialog] = useState(false);
	const [totalDealsCount, setTotalDealsCount] = useState<number>(0);

	console.log("🕒 Frontend Time (Local):", new Date().toString());
	console.log("🕒 Frontend Time (IST):", new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

	const periodMap = {
		// this is for Total clicks for selected period Card to plot graph
		day: 'daily',
		week: 'weekly',
		month: 'monthly',
		year: 'yearly',
	} as const;

	// Create an array of the last 7 days
	const getLast7DaysTrend = (deals: any[]) => {
		// this is for Total deals Card to plot graph
		const today = new Date();
		const last7Days = Array.from({ length: 7 }).map((_, i) => {
			const d = subDays(today, 6 - i);
			return {
				date: format(d, 'yyyy-MM-dd'),
				name: format(d, 'MMM d'),
				count: 0,
			};
		});

		deals.forEach((deal) => {
			const created = deal.createdAt || deal.date;
			if (!created) return;
			const dateStr = format(new Date(created), 'yyyy-MM-dd');
			const match = last7Days.find((d) => d.date === dateStr);
			if (match) match.count += 1;
		});

		return last7Days;
	};
	const dealTrendData = getLast7DaysTrend(topDeals);

	// The deletion password should be set in an environment variable
	// For this implementation, I'll use a hardcoded password as a fallback
	const correctPassword = import.meta.env.VITE_DELETE_PASSWORD || 'admin123';

	// useEffect(() => {
	// 	if (!isAuthenticated()) {
	// 		setShowLoginDialog(true);
	// 	}
	// }, []);

	// const handleLoginSuccess = () => {
	// 	setShowLoginDialog(false);
	// };

	// const handleLogout = () => {
	// 	logout();
	// 	navigate('/');
	// };

	// if (!isAuthenticated()) {
	// 	return (
	// 		<AdminLoginDialog
	// 			isOpen={showLoginDialog}
	// 			onClose={() => navigate('/')}
	// 			onSuccess={handleLoginSuccess}
	// 		/>
	// 	);
	// }

	useEffect(() => {
		if (isCategoryDialogOpen) {
			fetchCategories();
		}
	}, [isCategoryDialogOpen]);

	const fetchCategories = async () => {
		setIsLoadingCategories(true);
		try {
			const categories = await getAllCategories();
			setAvailableCategories(categories);
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to load categories',
				variant: 'destructive',
			});
		} finally {
			setIsLoadingCategories(false);
		}
	};

	// Fetch statistics data
	useEffect(() => {
		const fetchStats = async () => {
			setIsLoading(true);
			try {
				const stats = await getClickStats();
				setClickStats(stats);
			} catch (error) {
				console.error('Failed to fetch click stats:', error);
				toast({
					title: 'Error',
					description: 'Failed to fetch analytics data. Please try again.',
					variant: 'destructive',
				});
			} finally {
				setIsLoading(false);
			}
		};

		fetchStats();
	}, [toast]);

	// Fetch top performing deals
	useEffect(() => {
		const fetchTopDeals = async () => {
			setIsLoadingTop(true);
			try {
				const { topMessages, totalMessages } = await getTopPerformingDeals(5);
				setTopDeals(topMessages);
				setTotalDealsCount(totalMessages ? totalMessages : 100);
			} catch (error) {
				console.error('Failed to fetch top deals:', error);
				toast({
					title: 'Error',
					description:
						'Failed to fetch top performing deals. Please try again.',
					variant: 'destructive',
				});
				setTotalDealsCount(245); // Fallback value
			} finally {
				setIsLoadingTop(false);
			}
		};

		fetchTopDeals();
	}, [toast]);

	// Handle period change
	const handlePeriodChange = (period: 'day' | 'week' | 'month' | 'year') => {
		setActivePeriod(period);
	};

	// Get current chart data based on active period
	const getChartData = () => {
		if (!clickStats) return [];

		switch (activePeriod) {
			case 'day':
				return clickStats.daily || [];
			case 'week':
				return clickStats.weekly || [];
			case 'month':
				return clickStats.monthly || [];
			case 'year':
				return clickStats.yearly || [];
			default:
				return clickStats.daily || [];
		}
	};

	// Open dialog with deal details
	const handleOpenDealDetails = (deal: any) => {
		setSelectedDeal(deal);
		setIsDialogOpen(true);
	};

	// Open edit dialog
	const handleOpenEditDialog = () => {
		if (selectedDeal) {
			if (hasEditPermission()) {
				setEditedText(selectedDeal.text);
				setIsEditDialogOpen(true);
			} else {
				// Request password for edit permission
				setEditPassword('');
				setEditError('');
				setIsEditPasswordDialogOpen(true);
			}
		}
	};

	// Handle edit password verification
	const handleEditPasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!verifyActionPassword(editPassword)) {
			setEditError('Incorrect password. Please try again.');
			return;
		}
		
		// Grant edit permission for this session
		grantEditPermission();
		setIsEditPasswordDialogOpen(false);
		
		// Open edit dialog
		setEditedText(selectedDeal.text);
		setIsEditDialogOpen(true);
	};

	// Open category dialog
	const handleOpenCategoryDialog = () => {
		if (selectedDeal) {
			if (hasCategoryPermission()) {
				setSelectedCategory(selectedDeal.category || '');
				setIsCategoryDialogOpen(true);
			} else {
				// Request password for category permission
				setCategoryPassword('');
				setCategoryError('');
				setIsCategoryPasswordDialogOpen(true);
			}
		}
	};

	// Handle category password verification
	const handleCategoryPasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!verifyActionPassword(categoryPassword)) {
			setCategoryError('Incorrect password. Please try again.');
			return;
		}
		
		// Grant category permission for this session
		grantCategoryPermission();
		setIsCategoryPasswordDialogOpen(false);
		
		// Open category dialog
		setSelectedCategory(selectedDeal.category || '');
		setIsCategoryDialogOpen(true);
	};

	// Open delete confirmation dialog
	const handleOpenDeleteDialog = () => {
		setDeletePassword('');
		setDeleteError('');
		setIsDeleteDialogOpen(true);
	};

	// Save edited deal
	const handleSaveEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedDeal || !selectedDeal._id) return;

		setIsSubmittingEdit(true);

		try {
			const success = await updateMessageText(selectedDeal._id, editedText);
			if (success) {
				toast({
					title: 'Success',
					description: 'Deal was updated successfully',
				});
				// Update the deal in the list
				const updatedDeals = topDeals.map((deal) =>
					deal._id === selectedDeal._id ? { ...deal, text: editedText } : deal,
				);
				setTopDeals(updatedDeals);
				setSelectedDeal({ ...selectedDeal, text: editedText });
				setIsEditDialogOpen(false);
			} else {
				toast({
					title: 'Error',
					description: 'Failed to update deal',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An error occurred while updating the deal',
				variant: 'destructive',
			});
		} finally {
			setIsSubmittingEdit(false);
		}
	};

	// Save category change
	const handleSaveCategory = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedDeal || !selectedDeal._id) return;

		setIsSubmittingEdit(true);

		try {
			const success = await updateMessageCategory(
				selectedDeal._id,
				selectedCategory,
			);
			if (success) {
				toast({
					title: 'Success',
					description: 'Category was updated successfully',
				});
				// Update the deal in the list
				const updatedDeals = topDeals.map((deal) =>
					deal._id === selectedDeal._id
						? { ...deal, category: selectedCategory }
						: deal,
				);
				setTopDeals(updatedDeals);
				setSelectedDeal({ ...selectedDeal, category: selectedCategory });
				setIsCategoryDialogOpen(false);
			} else {
				toast({
					title: 'Error',
					description: 'Failed to update category',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An error occurred while updating the category',
				variant: 'destructive',
			});
		} finally {
			setIsSubmittingEdit(false);
		}
	};

	// Delete a deal with password confirmation
	const handleDeleteDeal = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedDeal || !selectedDeal._id) {
			return;
		}

		if (deletePassword !== correctPassword) {
			setDeleteError('Incorrect password. Please try again.');
			return;
		}

		try {
			const success = await deleteProduct(selectedDeal._id);
			if (success) {
				toast({
					title: 'Success',
					description: 'Deal was deleted successfully',
				});
				// Remove the deal from the list
				const updatedDeals = topDeals.filter(
					(deal) => deal._id !== selectedDeal._id,
				);
				setTopDeals(updatedDeals);
				setIsDeleteDialogOpen(false);
				setIsDialogOpen(false);
			} else {
				toast({
					title: 'Error',
					description: 'Failed to delete deal',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'An error occurred while deleting the deal',
				variant: 'destructive',
			});
		}
	};

	// Function to extract links and hostnames from URLs
	const truncateLink = (url: string) => {
		try {
			const { hostname } = new URL(url);
			return hostname;
		} catch {
			return url;
		}
	};

	// Function to make links in text clickable
	const makeLinksClickable = (text: string) => {
		if (!text) return '';

		const urlRegex = /(https?:\/\/[^\s]+)/g;
		const parts = text.split(urlRegex);

		return parts.map((part, index) => {
			if (part.match(urlRegex)) {
				return (
					<a
						key={`link-${index}-${part.substring(0, 10)}`}
						href={part}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => {
							if (selectedDeal?._id) {
								handleTrackedLinkClick(part, selectedDeal._id, e.nativeEvent);
							}

							if (e.ctrlKey || e.metaKey || e.button === 1) return;

							e.preventDefault();
							e.stopPropagation();

							setTimeout(() => {
								window.open(part, '_blank');
							}, 100);
						}}
						className="text-blue-600 hover:underline break-all inline-flex items-center gap-1">
						{truncateLink(part)}
						<ExternalLink size={12} />
					</a>
				);
			}
			return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
		});
	};

	// Format date for display
	const formatDate = (dateString: string) => {
		try {
			return format(new Date(dateString), 'MMM d, yyyy h:mm a');
		} catch (e) {
			return dateString;
		}
	};

	// Get period specific totals
	const getPeriodTotals = () => {
		if (!clickStats) return 0;

		switch (activePeriod) {
			case 'month':
				return clickStats.totalMonthClicks || 0;
			case 'year':
				return clickStats.totalYearClicks || 0;
			default:
				return clickStats.totalClicks || 0;
		}
	};

	// Get current period label
	const getPeriodLabel = () => {
		switch (activePeriod) {
			case 'day':
				return 'Last 7 Days';
			case 'week':
				return 'Last 7 Weeks';
			case 'month':
				return 'Last 7 Months';
			case 'year':
				return 'Last 3 Years';
			default:
				return 'Period';
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#09090B]">
			<Navbar />
			<main className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold">Analytics</h1>
					{/* <Button onClick={handleLogout} variant="outline">
						Logout
					</Button> */}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<AvgClicksCard
						title={'Avg. Daily Clicks'}
						description={'Based on last 7 days'}
						stats={clickStats?.daily || []}
						isLoading={isLoading}
						color="#f97316"
					/>
					<AvgClicksCard
						title={'Avg. Monthly Clicks'}
						description={'Based on last 7 months'}
						stats={clickStats?.monthly || []}
						isLoading={isLoading}
						color="#22c55e"
					/>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">Total Deals</CardTitle>
							<CardDescription>Available active deals</CardDescription>
						</CardHeader>

						<CardContent>
							{isLoadingTop ? (
								<div className="flex justify-center items-center h-24">
									<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
								</div>
							) : (
								<>
									<div className="flex items-end gap-2 mb-2">
										<span className="text-3xl font-bold">
											{totalDealsCount}
										</span>
										<div className="flex items-center text-sm text-green-500 mb-1">
											<Package className="h-4 w-4 mr-1" />
											<span>active</span>
										</div>
									</div>

									{/* 🔥 Trend Line */}
									<ResponsiveContainer width="100%" height={60}>
										<LineChart data={dealTrendData}>
											<XAxis dataKey="name" hide />
											<Tooltip
												content={({ active, payload, label }) => {
													if (active && payload && payload.length) {
														return (
															<div className="bg-white text-xs rounded-md shadow px-2 py-1 border border-gray-200">
																<div className="text-gray-500">{label}</div>
																<div className="text-orange-600 font-semibold">
																	{payload[0].value} deals
																</div>
															</div>
														);
													}
													return null;
												}}
											/>

											<Line
												type="monotone"
												dataKey="count"
												stroke="#3b82f6"
												strokeWidth={2}
												dot={false}
												animationDuration={300}
											/>
										</LineChart>
									</ResponsiveContainer>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-xl">{getPeriodLabel()}</CardTitle>
							<CardDescription>
								Total clicks for selected period
							</CardDescription>
						</CardHeader>

						<CardContent>
							{isLoading ? (
								<div className="flex justify-center items-center h-24">
									<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
								</div>
							) : (
								<>
									<div className="flex items-end gap-2 mb-2">
										<span className="text-3xl font-bold">
											{getPeriodTotals()}
										</span>
										<div className="flex items-center text-sm text-green-500 mb-1">
											<TrendingUp className="h-4 w-4 mr-1" />
											<span>{activePeriod}</span>
										</div>
									</div>

									{/* 📊 Sparkline below the total */}
									<ResponsiveContainer width="100%" height={60}>
										<LineChart
											data={clickStats?.[periodMap[activePeriod]] || []}>
											<XAxis dataKey="name" hide />
											<Tooltip
												content={({ active, payload, label }) => {
													if (active && payload && payload.length) {
														return (
															<div className="bg-white text-xs rounded-md shadow px-2 py-1 border border-gray-200">
																<div className="text-gray-500">{label}</div>
																<div className="text-green-600 font-semibold">
																	{payload[0].value} clicks
																</div>
															</div>
														);
													}
													return null;
												}}
											/>

											<Line
												type="monotone"
												dataKey="clicks"
												stroke="#fde047"
												strokeWidth={2}
												dot={false}
												animationDuration={300}
											/>
										</LineChart>
									</ResponsiveContainer>
								</>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
					<div className="lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>Performance Metrics</CardTitle>
								<CardDescription>{getPeriodLabel()} Stats</CardDescription>
								<Tabs defaultValue="day" className="w-[360px]">
									<TabsList>
										<TabsTrigger
											value="day"
											onClick={() => handlePeriodChange('day')}>
											Day
										</TabsTrigger>
										<TabsTrigger
											value="week"
											onClick={() => handlePeriodChange('week')}>
											Week
										</TabsTrigger>
										<TabsTrigger
											value="month"
											onClick={() => handlePeriodChange('month')}>
											Month
										</TabsTrigger>
										<TabsTrigger
											value="year"
											onClick={() => handlePeriodChange('year')}>
											Year
										</TabsTrigger>
									</TabsList>
								</Tabs>
							</CardHeader>
							<CardContent>
								<PerformanceMetricsChart
									data={getChartData()}
									isLoading={isLoading}
									period={activePeriod}
								/>
							</CardContent>
						</Card>
					</div>

					<div>
						<Card className="h-full flex flex-col">
							<CardHeader>
								<CardTitle>Top Performing Deals</CardTitle>
								<CardDescription>
									Most clicked deals in selected period
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 overflow-hidden flex flex-col">
								{isLoadingTop ? (
									<div className="flex justify-center items-center h-full flex-1">
										<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
									</div>
								) : !topDeals ? (
									<div className="text-center py-8 flex-1 flex items-center justify-center">
										<div>
											<BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
											<p className="text-gray-500">No click data available</p>
										</div>
									</div>
								) : (
									<div className="space-y-1 flex-1">
										{topDeals.map((deal, index) => (
											<div
												key={deal._id || deal.id || index}
												className="p-3 rounded-lg  border-gray-100 hover:bg-gray-50 dark:hover:bg-apple-darkGray cursor-pointer transition-colors"
												onClick={() => handleOpenDealDetails(deal)}>
												<h3 className="text-sm font-medium line-clamp-1 mb-1">
													{deal.text?.split('\n')[0] || 'Deal'}
												</h3>
												<div className="flex items-center justify-between text-xs text-gray-500">
													<span>Clicks: {deal.clicks || 0}</span>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			{/* Deal Details Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[95vw] w-[95vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="text-xl">
							{selectedDeal?.text?.split('\n')[0] || 'Deal Details'}
						</DialogTitle>
					</DialogHeader>

					{selectedDeal && (
						<div className="mt-4 space-y-4">
							<div className="text-sm whitespace-pre-line">
								{makeLinksClickable(selectedDeal.text)}
							</div>

							<div className="grid grid-cols-2 gap-2">
								<Button onClick={handleOpenEditDialog} variant="outline">
									Edit Text
								</Button>
								<Button onClick={handleOpenCategoryDialog} variant="outline">
									Change Category
								</Button>
								<Button
									onClick={handleOpenDeleteDialog}
									variant="destructive"
									className="col-span-2">
									Delete
								</Button>
							</div>

							<div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
								<div>
									Created:{' '}
									{formatDate(
										selectedDeal.date || selectedDeal.createdAt || '',
									)}
								</div>
								<div>Clicks: {selectedDeal.clicks || 0}</div>
								{selectedDeal.category && (
									<div>Category: {selectedDeal.category}</div>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Edit Password Dialog */}
			<Dialog 
				open={isEditPasswordDialogOpen} 
				onOpenChange={setIsEditPasswordDialogOpen}
			>
				<DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-blue-500" /> 
							Authentication Required
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleEditPasswordSubmit}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to edit deals:
							</p>
							
							<Input
								type="password"
								value={editPassword}
								onChange={(e) => {
									setEditPassword(e.target.value);
									setEditError('');
								}}
								placeholder="Enter password"
							/>
							
							{editError && (
								<p className="text-sm text-red-500">{editError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditPasswordDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!editPassword.trim()}>
								Verify
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Category Password Dialog */}
			<Dialog 
				open={isCategoryPasswordDialogOpen} 
				onOpenChange={setIsCategoryPasswordDialogOpen}
			>
				<DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-purple-500" /> 
							Authentication Required
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleCategoryPasswordSubmit}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to change categories:
							</p>
							
							<Input
								type="password"
								value={categoryPassword}
								onChange={(e) => {
									setCategoryPassword(e.target.value);
									setCategoryError('');
								}}
								placeholder="Enter password"
							/>
							
							{categoryError && (
								<p className="text-sm text-red-500">{categoryError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryPasswordDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!categoryPassword.trim()}>
								Verify
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[95vw] w-[95vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle>Edit Deal</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleSaveEdit}>
						<div className="mt-4">
							<Textarea
								value={editedText}
								onChange={(e) => setEditedText(e.target.value)}
								placeholder="Deal description"
								className="min-h-[200px]"
							/>
						</div>

						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmittingEdit || !editedText.trim()}>
								{isSubmittingEdit ? 'Saving...' : 'Save Changes'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Category Dialog */}
			<Dialog
				open={isCategoryDialogOpen}
				onOpenChange={setIsCategoryDialogOpen}
			>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle>Change Category</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleSaveCategory}>
						<div className="mt-4">
							<Select
								value={selectedCategory}
								onValueChange={setSelectedCategory}
								disabled={isLoadingCategories}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									{isLoadingCategories ? (
										<SelectItem value="loading" disabled>
											Loading categories...
										</SelectItem>
									) : (
										availableCategories.map((cat) => (
											<SelectItem key={cat} value={cat}>
												{cat}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<DialogFooter className="mt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCategoryDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSubmittingEdit || !selectedCategory.trim()}>
								{isSubmittingEdit ? 'Saving...' : 'Save Category'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog with Password */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[95vw] w-[95vw] sm:w-auto rounded-xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-red-500" /> Confirm Deletion
						</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleDeleteDeal}>
						<div className="mt-4 space-y-4">
							<p className="text-sm">
								Please enter the admin password to confirm deletion:
							</p>

							<Input
								type="password"
								value={deletePassword}
								onChange={(e) => {
									setDeletePassword(e.target.value);
									setDeleteError('');
								}}
								placeholder="Enter password"
							/>

							{deleteError && (
								<p className="text-sm text-red-500">{deleteError}</p>
							)}
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsDeleteDialogOpen(false)}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={!deletePassword.trim()}
								variant="destructive">
								Confirm Delete
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Admin;
