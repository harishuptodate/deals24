import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Target, Heart, ShoppingBag, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const isMobile = useIsMobile();
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const searchParams = new URLSearchParams(location.search);
		const queryParam = searchParams.get('search');
		if (queryParam) {
			setSearchQuery(queryParam);
		}
	}, [location.search]);

	const handleSearch = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (searchQuery.trim()) {
			navigate(`/deals?search=${encodeURIComponent(searchQuery.trim())}`);
			setIsSearchPopoverOpen(false);
		}
	};

	const handlePopularSearch = (query: string) => {
		setSearchQuery(query);
		navigate(`/deals?search=${encodeURIComponent(query)}`);
		setIsSearchPopoverOpen(false);
	};

	const popularSearches = [
		'TV',
		'LG',
		'TWS',
		'4K TV',
		'iPhone',
		'Watch',
		'MacBook',
		'Samsung',
		'T-shirt',
		'Headphones',
		'Gaming Laptop',
		'Refrigerator',
		'Washing Machine',
		'Air Conditioner',
	];

	return (
		<header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between">
					<div className="flex items-center">
						<Link to="/" className="flex items-center">
							<Target className="h-8 w-8 mr-2" />
							<span className="text-2xl font-bold">Deals24</span>
						</Link>
					</div>

					<div className="flex-1 mx-4 max-w-xl">
						<form onSubmit={handleSearch} className="relative">
							<Popover
								open={isSearchPopoverOpen}
								onOpenChange={(open) => {
									setIsSearchPopoverOpen(open);
									if (open && inputRef.current) {
										setTimeout(() => {
											inputRef.current?.focus();
										}, 0);
									}
								}}>
								<PopoverTrigger asChild>
									<div className="relative">
										<Input
											ref={inputRef}
											type="search"
											placeholder="Search deals..."
											className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-apple-darkGray"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											onFocus={() => setIsSearchPopoverOpen(true)}
										/>
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
										<Button
											type="submit"
											size="icon"
											variant="ghost"
											className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full hover:bg-gray-100"
											onClick={() => handleSearch()}>
											<Search className="h-5 w-5" />
										</Button>
									</div>
								</PopoverTrigger>
								<PopoverContent
									className="p-2 w-[var(--radix-popover-trigger-width)] rounded-xl mt-1"
									align="start"
									sideOffset={5}>
									<div className="space-y-2">
										<h3 className="text-sm font-medium text-apple-darkGray px-2">
											Popular searches
										</h3>
										<div className="flex flex-wrap gap-2 p-1">
											{popularSearches.map((search) => (
												<button
													key={search}
													onClick={() => handlePopularSearch(search)}
													className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-xs text-apple-darkGray transition-colors">
													{search}
												</button>
											))}
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</form>
					</div>

					{isMobile ? (
						<div className="flex items-center">
							<Button
								variant="ghost"
								size="icon"
								className="ml-2"
								onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
								<Menu className="h-6 w-6" />
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<Link to="/deals">
								<Button
									variant="ghost"
									size="sm"
									className="text-sm rounded-full">
									<ShoppingBag className="h-5 w-5 mr-1" />
									<span>Deals</span>
								</Button>
							</Link>
							<Link to="/categories">
								<Button
									variant="ghost"
									size="sm"
									className="text-sm rounded-full">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-5 w-5 mr-1">
										<rect width="7" height="7" x="3" y="3" rx="1" />
										<rect width="7" height="7" x="14" y="3" rx="1" />
										<rect width="7" height="7" x="14" y="14" rx="1" />
										<rect width="7" height="7" x="3" y="14" rx="1" />
									</svg>
									<span>Categories</span>
								</Button>
							</Link>
							<Link to="/wishlist">
								<Button
									variant="ghost"
									size="sm"
									className="text-sm rounded-full">
									<Heart className="h-5 w-5 mr-1" />
									<span>Wishlist</span>
								</Button>
							</Link>
							<Link to="/admin">
								<Button className="rounded-full">Admin</Button>
							</Link>
						</div>
					)}
				</div>

				{/* Mobile menu */}
				{isMobile && mobileMenuOpen && (
					<div className="py-2 border-t border-gray-200 animate-fade-down">
						<div className="flex flex-col space-y-2">
							<Link
								to="/deals"
								className="px-4 py-2 hover:bg-gray-100 rounded-md flex items-center">
								<ShoppingBag className="h-5 w-5 mr-2" />
								Deals
							</Link>
							<Link
								to="/categories"
								className="px-4 py-2 hover:bg-gray-100 rounded-md flex items-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="h-5 w-5 mr-2">
									<rect width="7" height="7" x="3" y="3" rx="1" />
									<rect width="7" height="7" x="14" y="3" rx="1" />
									<rect width="7" height="7" x="14" y="14" rx="1" />
									<rect width="7" height="7" x="3" y="14" rx="1" />
								</svg>
								Categories
							</Link>
							<Link
								to="/wishlist"
								className="px-4 py-2 hover:bg-gray-100 rounded-md flex items-center">
								<Heart className="h-5 w-5 mr-2" />
								Wishlist
							</Link>
							<Link
								to="/admin"
								className="px-4 py-2 bg-apple-darkGray text-white rounded-md flex items-center justify-center">
								Admin
							</Link>
						</div>
					</div>
				)}
			</div>
		</header>
	);
};

export default Navbar;
