import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
	getTelegramMessages,
	deleteProduct,
	updateMessageText,
} from '../services/api';
import DealCard from '../components/DealCard';
import DealCardSkeleton from '../components/DealCardSkeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { BigFooter } from '@/components/BigFooter';

const Deals = () => {
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const categoryParam = searchParams.get('category');
	const searchQuery = searchParams.get('search');
	const [activeCategory, setActiveCategory] = useState<string | null>(
		categoryParam,
	);

	useEffect(() => {
		setActiveCategory(categoryParam);
	}, [categoryParam]);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['all-telegram-messages', activeCategory, searchQuery],
		queryFn: ({ pageParam }) =>
			getTelegramMessages(
				pageParam as string | undefined,
				activeCategory || undefined,
				searchQuery || undefined,
			),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		retry: 2,
		meta: {
			onError: () => {
				toast({
					title: 'Error',
					description: 'Failed to load deals. Please try again later.',
					variant: 'destructive',
				});
			},
		},
	});

	const { observerTarget } = useInfiniteScroll({
		hasNextPage: !!hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		isInitialLoading: isLoading,
	});

	const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

	const totalDealsCount = data?.pages?.[0]?.totalDealsCount ?? 0;

	const clearFilter = () => {
		navigate('/deals');
	};

	const viewAllDeals = () => {
		navigate('/deals');
	};

	const handleDeleteProduct = async (id: string) => {
		if (!id) {
			toast({
				title: 'Error',
				description: 'Cannot delete: Deal ID is missing',
				variant: 'destructive',
			});
			return;
		}

		try {
			console.log(`Attempting to delete deal with ID: ${id}`);
			const success = await deleteProduct(id);

			if (success) {
				toast({
					title: 'Success',
					description: 'Deal has been deleted successfully',
					variant: 'default',
				});
				refetch();
			} else {
				toast({
					title: 'Error',
					description: 'Failed to delete deal',
					variant: 'destructive',
				});
			}
		} catch (error) {
			console.error('Error deleting deal:', error);
			toast({
				title: 'Error',
				description: 'An error occurred while deleting the deal',
				variant: 'destructive',
			});
		}
	};

	const handleEditProduct = async (id: string, newText: string) => {
		if (!id) {
			toast({
				title: 'Error',
				description: 'Cannot edit: Deal ID is missing',
				variant: 'destructive',
			});
			return;
		}

		try {
			console.log(`Attempting to edit deal with ID: ${id}`);
			const success = await updateMessageText(id, newText);

			if (success) {
				toast({
					title: 'Success',
					description: 'Deal has been updated successfully',
					variant: 'default',
				});
				refetch();
			} else {
				toast({
					title: 'Error',
					description: 'Failed to update deal',
					variant: 'destructive',
				});
			}
		} catch (error) {
			console.error('Error updating deal:', error);
			toast({
				title: 'Error',
				description: 'An error occurred while updating the deal',
				variant: 'destructive',
			});
		}
	};

	let pageTitle = 'Latest Deals';
	if (searchQuery) {
		pageTitle = `Search Results: ${searchQuery}`;
	} else if (activeCategory) {
		pageTitle = `${activeCategory
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')} Deals`;
	}

	return (
		<div className="min-h-screen bg-white dark:bg-[#09090B]">
			<Navbar />
			<main className="container mx-auto px-4 py-6 md:py-12">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold text-gradient dark:text-gradient">
							{pageTitle}
						</h1>

						{ (searchQuery || activeCategory) && totalDealsCount > 0 && (
							<p className="text-sm sm:text-md md:text-lg font-medium text-gray-600 dark:text-gray-300">
								{totalDealsCount} result{totalDealsCount > 1 ? 's' : ''} found
							</p>
						)}
					</div>

					{(activeCategory || searchQuery) && (
						<Button
							variant="outline"
							className="flex items-center gap-2 rounded-full dark:border-gray-700 dark:text-gray-200"
							onClick={clearFilter}>
							<X size={16} />
							Clear {searchQuery ? 'Search' : 'Filter'}
						</Button>
					)}
				</div>

				<ErrorBoundary>
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
							{[...Array(12)].map((_, index) => (
								<DealCardSkeleton key={`skeleton-${index}`} />
							))}
						</div>
					) : isError ? (
						<div className="text-center py-8 mb-8">
							<p className="text-apple-gray dark:text-gray-400 mb-4">
								Unable to load deals. Please try again later.
							</p>
							<Button
								onClick={() => refetch()}
								variant="outline"
								className="dark:border-gray-700 dark:text-gray-200">
								Retry
							</Button>
						</div>
					) : allMessages.length === 0 ? (
						<div className="text-center py-8 mb-8">
							<p className="text-apple-gray dark:text-gray-400 mb-4">
								{searchQuery
									? `No deals found for "${searchQuery}".`
									: activeCategory
									? 'No deals found for this category.'
									: 'No deals available at the moment.'}
							</p>
							{(activeCategory || searchQuery) && (
								<Button
									onClick={viewAllDeals}
									variant="outline"
									className="dark:border-gray-700 dark:text-gray-200">
									View All Deals
								</Button>
							)}
							<div className="pt-96 sm:pt-24 ">
								<BigFooter />
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
							{allMessages.map((message) => {
								if (!message || !message.text) {
									return null;
								}

								const messageId = message.id || message._id;

								return (
									<div key={messageId || `message-${Math.random()}`}>
										<DealCard
											title={message.text.split('\n')[0] || 'New Deal'}
											description={message.text}
											link={message.link || ''}
											id={messageId}
											category={message.category || ''}
											createdAt={message.date || message.createdAt}
											onDelete={handleDeleteProduct}
											onEdit={handleEditProduct}
										/>
									</div>
								);
							})}
						</div>
					)}
				</ErrorBoundary>

				{hasNextPage && (
					<div
						ref={observerTarget}
						className="w-full h-20 flex justify-center items-center mt-4">
						{isFetchingNextPage && (
							<Loader2 className="w-6 h-6 animate-spin text-apple-gray dark:text-gray-400" />
						)}
					</div>
				)}
			</main>
			{allMessages.length != 0 && (
				<div className="sm:pt-1">
					<BigFooter />
				</div>
			)}
		</div>
	);
};

export default Deals;
