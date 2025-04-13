import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getTelegramMessages, deleteProduct } from '../services/api';
import DealCard from './DealCard';
import { Button } from '@/components/ui/button';
import { Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { usePaginationState } from '../hooks/usePaginationState';

interface CategoryFilterProps {
	onSelect: (category: string | null) => void;
	current: string | null;
	onSubCategorySelect: (subCategory: string) => void;
}

const CategoryFilter = ({
	onSelect,
	current,
	onSubCategorySelect,
}: CategoryFilterProps) => {
	const categories = [
		{ name: 'All', slug: null },
		{ name: 'Electronics & Home', slug: 'electronics-home' },
		{ name: 'Laptops & PCs', slug: 'laptops' },
		{ name: 'Mobile Phones', slug: 'mobile-phones' },
		{ name: 'Gadgets & Accessories', slug: 'gadgets-accessories' },
		{ name: 'Fashion', slug: 'fashion' },
	];

	const subCategories = {
		'electronics-home': [
			'TV',
			'Air Conditioner',
			'Refrigerator',
			'Washing Machine',
		],
		laptops: [
			'Gaming Laptop',
			'MacBook',
			'Mac',
			'iMac',
			'ThinkPad',
			'Chromebook',
		],
		'mobile-phones': ['iPhone', 'Samsung', 'OnePlus', 'Pixel'],
		'gadgets-accessories': [
			'Headphones',
			'Charger',
			'Power Bank',
			'Smartwatch',
		],
		fashion: ['Shoes', 'T-Shirt', 'Watch', 'Backpack'],
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center mb-6 overflow-x-auto pb-2 gap-2 max-w-full">
				<Filter size={16} className="text-apple-gray mr-1 flex-shrink-0" />
				{categories.map((category) => (
					<button
						key={category.name}
						onClick={() => onSelect(category.slug)}
						className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
							current === category.slug ||
							(current === null && category.slug === null)
								? 'bg-apple-darkGray text-white'
								: 'bg-gray-100 text-apple-gray hover:bg-gray-200'
						}`}>
						{category.name}
					</button>
				))}
			</div>

			{current && subCategories[current as keyof typeof subCategories] && (
				<div className="flex flex-wrap gap-2 mb-4">
					{subCategories[current as keyof typeof subCategories].map(
						(subCat) => (
							<button
								key={subCat}
								onClick={() => onSubCategorySelect(subCat)}
								className="bg-gray-100 hover:bg-gray-200 text-apple-gray text-xs px-3 py-1.5 rounded-full">
								{subCat}
							</button>
						),
					)}
				</div>
			)}
		</div>
	);
};

const DealGrid = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const searchQuery = searchParams.get('search');
	const [activeCategory, setActiveCategory] = useState<string | null>(null);
	const observerTarget = useRef<HTMLDivElement>(null);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	
	const { 
		initialCursor, 
		savePaginationState, 
		isInitialLoad,
		setIsInitialLoad
	} = usePaginationState('home-deals');

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['telegram-messages', activeCategory, searchQuery],
		queryFn: ({ pageParam }) =>
			getTelegramMessages(
				pageParam as string | undefined,
				activeCategory,
				searchQuery,
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

	useEffect(() => {
		if (data?.pages?.length > 0) {
			const lastPage = data.pages[data.pages.length - 1];
			if (lastPage.nextCursor) {
				savePaginationState(lastPage.nextCursor);
			}
		}
	}, [data, savePaginationState]);

	useEffect(() => {
		const handleScroll = () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
			
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

	useEffect(() => {
		if (data && isInitialLoad) {
			const timer = setTimeout(() => {
				setIsInitialLoad(false);
			}, 500);
			
			return () => clearTimeout(timer);
		}
	}, [data, isInitialLoad, setIsInitialLoad]);

	useEffect(() => {
		if (!isInitialLoad) {
			refetch();
		}
	}, [activeCategory, searchQuery, refetch, isInitialLoad]);

	const handleObserver = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const target = entries[0];
			if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
				console.log('Intersection observer triggered - fetching next page in DealGrid');
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
	}, [handleObserver, observerTarget]);

	const handleCategoryChange = (category: string | null) => {
		setActiveCategory(category);
	};

	const navigateToCategory = () => {
		navigate('/categories');
	};

	const handleSubCategorySelect = (subCategory: string) => {
		navigate(`/deals?search=${encodeURIComponent(subCategory)}`);
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
			console.log(`Attempting to delete product with ID: ${id}`);
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
			console.error('Error deleting product:', error);
			toast({
				title: 'Error',
				description: 'An error occurred while deleting the deal',
				variant: 'destructive',
			});
		}
	};

	const viewAllDeals = () => {
		navigate('/deals');
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center min-h-[400px]">
				<Loader2 className="w-8 h-8 animate-spin text-apple-gray" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="text-center py-16">
				<p className="text-apple-gray">
					Unable to load deals. Please try again later.
				</p>
				<Button onClick={() => refetch()} variant="outline" className="mt-4">
					Refresh
				</Button>
			</div>
		);
	}

	const allMessages = data?.pages.flatMap((page) => page.data) ?? [];

	if (allMessages.length === 0) {
		return (
			<div className="text-center py-16">
				<p className="text-apple-gray">
					{searchQuery
						? `No deals found for "${searchQuery}".`
						: activeCategory
						? 'No deals found for this category.'
						: 'No deals available at the moment.'}
				</p>
				{(searchQuery || activeCategory) && (
					<Button onClick={viewAllDeals} variant="outline" className="mt-4">
						View All Deals
					</Button>
				)}
			</div>
		);
	}

	return (
		<section className="py-8 md:py-16 bg-gradient-to-b from-apple-lightGray to-white">
			<div className="container mx-auto px-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
					<h2 className="text-2xl font-semibold text-gradient">Latest Deals</h2>
					<div className="flex gap-2 flex-wrap">
						<Button
							variant="ghost"
							className="text-apple-darkGray hover:text-black text-xs px-3 py-1 h-auto"
							onClick={navigateToCategory}>
							Browse Categories
						</Button>
						<Button
							variant="ghost"
							className="text-apple-darkGray hover:text-black text-xs px-3 py-1 h-auto"
							asChild>
							<a href="/deals">View All</a>
						</Button>
					</div>
				</div>

				<CategoryFilter
					onSelect={handleCategoryChange}
					current={activeCategory}
					onSubCategorySelect={handleSubCategorySelect}
				/>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
								/>
							</div>
						);
					})}
				</div>

				{hasNextPage && (
					<div
						ref={observerTarget}
						className="w-full h-20 flex justify-center items-center mt-4">
						{isFetchingNextPage && (
							<Loader2 className="w-6 h-6 animate-spin text-apple-gray" />
						)}
					</div>
				)}
			</div>
		</section>
	);
};

export default DealGrid;
