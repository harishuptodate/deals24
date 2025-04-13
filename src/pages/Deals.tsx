import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
	getTelegramMessages,
	deleteProduct,
	updateMessageText,
} from '../services/api';
import DealCard from '../components/DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePaginationState } from '../hooks/usePaginationState';

const Deals = () => {
	const { toast } = useToast();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const categoryParam = searchParams.get('category');
	const searchQuery = searchParams.get('search');
	const [activeCategory, setActiveCategory] = useState<string | null>(
		categoryParam,
	);
	const observerTarget = useRef<HTMLDivElement>(null);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	
	// Use a unique key for this page's pagination state
	const { 
		initialCursor, 
		savePaginationState, 
		isInitialLoad,
		setIsInitialLoad
	} = usePaginationState('deals-page');

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
		initialPageParam: initialCursor,
		getNextPageParam: (lastPage) => {
			return lastPage.nextCursor;
		},
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

	// Update cursor state whenever data changes
	useEffect(() => {
		if (data?.pages?.length > 0) {
			const lastPage = data.pages[data.pages.length - 1];
			if (lastPage.nextCursor) {
				savePaginationState(lastPage.nextCursor);
			}
		}
	}, [data, savePaginationState]);

	// Save scroll position on scroll with debounce
	useEffect(() => {
		const handleScroll = () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
			
			// Only update after scrolling stops for 200ms and not during initial load
			scrollTimeoutRef.current = setTimeout(() => {
				if (!isInitialLoad) {
					const currentCursor = searchParams.get('cursor') || undefined;
					savePaginationState(currentCursor, window.scrollY);
				}
			}, 200);
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		
		return () => {
			window.removeEventListener('scroll', handleScroll);
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, [isInitialLoad, searchParams, savePaginationState]);

	// Set initial load complete after data is loaded
	useEffect(() => {
		if (data && isInitialLoad) {
			// Small delay to ensure content has rendered
			const timer = setTimeout(() => {
				setIsInitialLoad(false);
			}, 500);
			
			return () => clearTimeout(timer);
		}
	}, [data, isInitialLoad, setIsInitialLoad]);

	// Implement intersection observer for infinite scrolling
	const handleObserver = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const target = entries[0];
			// Make sure we're not in initial load and not already fetching
			if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
				console.log('Intersection observer triggered - fetching next page');
				fetchNextPage();
			}
		},
		[fetchNextPage, hasNextPage, isFetchingNextPage],
	);

	useEffect(() => {
		const observer = new IntersectionObserver(handleObserver, {
			rootMargin: '0px 0px 300px 0px',
			threshold: 0.1,
		});

		const currentObserverTarget = observerTarget.current;
		
		if (currentObserverTarget) {
			observer.observe(currentObserverTarget);
		}

		return () => {
			if (currentObserverTarget) {
				observer.unobserve(currentObserverTarget);
			}
		};
	}, [handleObserver]);

	const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

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
		<div className="min-h-screen bg-white">
			<Navbar />
			<main className="container mx-auto px-4 py-6 md:py-12">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
					<h1 className="text-2xl md:text-3xl font-bold text-gradient mb-4 sm:mb-0">
						{pageTitle}
					</h1>
					{(activeCategory || searchQuery) && (
						<Button
							variant="outline"
							className="flex items-center gap-2 rounded-full"
							onClick={clearFilter}>
							<X size={16} />
							Clear {searchQuery ? 'Search' : 'Filter'}
						</Button>
					)}
				</div>

				{isLoading ? (
					<div className="flex justify-center items-center min-h-[400px]">
						<Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
					</div>
				) : isError ? (
					<div className="text-center py-8 mb-8">
						<p className="text-apple-gray mb-4">
							Unable to load deals. Please try again later.
						</p>
						<Button onClick={() => refetch()} variant="outline">
							Retry
						</Button>
					</div>
				) : allMessages.length === 0 ? (
					<div className="text-center py-8 mb-8">
						<p className="text-apple-gray mb-4">
							{searchQuery
								? `No deals found for "${searchQuery}".`
								: activeCategory
								? 'No deals found for this category.'
								: 'No deals available at the moment.'}
						</p>
						{(activeCategory || searchQuery) && (
							<Button onClick={viewAllDeals} variant="outline">
								View All Deals
							</Button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{allMessages.map((message) => {
							// Skip rendering if message is undefined or doesn't have required fields
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

				{/* Intersection observer target for infinite scrolling */}
				{hasNextPage && (
					<div
						ref={observerTarget}
						className="w-full h-20 flex justify-center items-center mt-4">
						{isFetchingNextPage && (
							<Loader2 className="w-6 h-6 animate-spin text-apple-gray" />
						)}
					</div>
				)}
			</main>
		</div>
	);
};

export default Deals;
