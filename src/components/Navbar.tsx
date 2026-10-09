import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
	Search,
	Target,
	ShoppingBag,
	ChartNoAxesColumn,
	CommandIcon,
	Activity,
	Send,
	ShieldBan,
	LogIn,
	LogOut,
	ShieldCheck,
	ChevronDown,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ThemeToggle from '@/components/ThemeToggle';
import WishlistAlertIcon from '@/components/wishlist/WishlistAlertIcon';
import AuthDialog from '@/components/auth/AuthDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
	ADMIN_AUTH_CHANGE_EVENT,
	isAuthenticated as isAdminAuthenticated,
	logout as adminLogout,
} from '@/services/authService';

const Navbar = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const isMobile = useIsMobile();
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
	const [isAuthOpen, setIsAuthOpen] = useState(false);
	const [isLogoutOpen, setIsLogoutOpen] = useState(false);
	const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
	const { user, signOut } = useAuth();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const searchParams = new URLSearchParams(location.search);
		const queryParam = searchParams.get('search');
		setSearchQuery(queryParam || '');
	}, [location.search]);

	useEffect(() => {
		const syncAdminSession = () => setIsAdmin(isAdminAuthenticated());
		window.addEventListener(ADMIN_AUTH_CHANGE_EVENT, syncAdminSession);
		window.addEventListener('storage', syncAdminSession);
		return () => {
			window.removeEventListener(ADMIN_AUTH_CHANGE_EVENT, syncAdminSession);
			window.removeEventListener('storage', syncAdminSession);
		};
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.ctrlKey || e.metaKey) &&
				e.key === 'k' &&
				document.activeElement?.tagName !== 'INPUT' &&
				document.activeElement?.tagName !== 'TEXTAREA'
			) {
				e.preventDefault();
				setIsSearchPopoverOpen(true);
				setTimeout(() => {
					inputRef.current?.focus();
				}, 0);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

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

	const handleAccountClick = () => {
		if (!user) {
			setIsAuthOpen(true);
		}
	};

	const openLogoutDialog = () => {
		setIsLogoutOpen(true);
	};

	const accountInitial = user?.email?.charAt(0).toUpperCase() || 'U';

	const renderAccountMenu = (compact = false) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size={compact ? 'icon' : 'sm'}
					className={compact
						? 'relative h-8 w-8 rounded-full p-0'
						: 'max-w-48 gap-2 rounded-full border border-transparent px-2 hover:border-violet-200 hover:bg-violet-50 dark:hover:border-violet-900 dark:hover:bg-violet-950/40'}
					aria-label="Open account and admin menu">
					<Avatar className={compact ? 'h-6 w-6' : 'h-7 w-7'}>
						<AvatarFallback className="bg-gradient-to-br from-violet-100 to-indigo-100 text-xs font-semibold text-violet-700 dark:from-violet-950 dark:to-indigo-950 dark:text-violet-300">
							{user ? accountInitial : <LogIn className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
						</AvatarFallback>
					</Avatar>
					{!compact && (
						<>
							<span className="truncate">{user ? user.email : 'Account'}</span>
							<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
						</>
					)}
					{isAdmin && (
						<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-violet-500" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={8}
				collisionPadding={8}
				className={compact
					? 'w-[calc(100vw-1rem)] max-w-56 rounded-xl border-gray-200/80 p-1.5 text-xs shadow-xl dark:border-gray-800 [&_[role=menuitem]]:text-xs'
					: 'w-[calc(100vw-1rem)] max-w-80 rounded-2xl border-gray-200/80 p-2 shadow-xl dark:border-gray-800'}>
				{user ? (
					<div className={compact ? 'flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-zinc-900/70' : 'flex items-center gap-3 rounded-xl bg-gray-50 p-2.5 dark:bg-zinc-900/70'}>
						<Avatar className={compact ? 'h-8 w-8' : 'h-10 w-10'}>
							<AvatarFallback className="bg-gradient-to-br from-violet-100 to-indigo-100 font-semibold text-violet-700 dark:from-violet-950 dark:to-indigo-950 dark:text-violet-300">
								{accountInitial}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className={compact ? 'text-[10px] text-muted-foreground' : 'text-xs text-muted-foreground'}>Signed in as</p>
							<p className={compact ? 'truncate text-xs font-semibold' : 'truncate text-sm font-semibold'}>{user.email}</p>
						</div>
						<DropdownMenuItem
							onSelect={openLogoutDialog}
							className={compact ? 'shrink-0 cursor-pointer rounded-full px-2 py-1.5 text-[10px] text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40' : 'shrink-0 cursor-pointer rounded-full px-2.5 py-2 text-xs text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/40'}>
							<LogOut className="mr-1.5 h-3.5 w-3.5" />Sign out
						</DropdownMenuItem>
					</div>
				) : (
					<>
						<div className={compact ? 'rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 p-2 dark:from-violet-950/50 dark:to-indigo-950/50' : 'rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-3 dark:from-violet-950/50 dark:to-indigo-950/50'}>
							<p className={compact ? 'text-xs font-semibold' : 'text-sm font-semibold'}>Your Deals24 account</p>
							<p className={compact ? 'mt-0.5 text-[10px] leading-4 text-muted-foreground' : 'mt-0.5 text-xs leading-5 text-muted-foreground'}>Sync your saved deals and alerts securely.</p>
						</div>
						<DropdownMenuItem onSelect={handleAccountClick} className={compact ? 'mt-1 rounded-lg p-2 font-medium' : 'mt-1 rounded-xl p-3 font-medium'}>
							<LogIn className="mr-2.5 h-4 w-4 text-violet-600" />Sign in with email
						</DropdownMenuItem>
					</>
				)}

				{compact && (
					<>
						<DropdownMenuSeparator className="my-2" />
						<DropdownMenuLabel className="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
							Explore
						</DropdownMenuLabel>
						<DropdownMenuItem asChild className="rounded-md py-1.5"><Link to="/deals"><ShoppingBag className="mr-2 h-3.5 w-3.5" />Deals</Link></DropdownMenuItem>
						<DropdownMenuItem asChild className="rounded-md py-1.5"><Link to="/categories"><ChartNoAxesColumn className="mr-2 h-3.5 w-3.5" />Categories</Link></DropdownMenuItem>
					</>
				)}

				<DropdownMenuSeparator className={compact ? 'my-1.5' : 'my-2'} />
				<DropdownMenuLabel className={compact ? 'px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground' : 'px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground'}>
					Administration
				</DropdownMenuLabel>
				{isAdmin ? (
					<>
						<DropdownMenuItem asChild className="rounded-lg"><Link to="/admin"><ChartNoAxesColumn className="mr-2.5 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
						<DropdownMenuItem asChild className="rounded-lg"><Link to="/admin/post-deal"><Send className="mr-2.5 h-4 w-4" />Post a deal</Link></DropdownMenuItem>
						<DropdownMenuItem asChild className="rounded-lg"><Link to="/admin/blacklist"><ShieldBan className="mr-2.5 h-4 w-4" />Blacklist</Link></DropdownMenuItem>
						<DropdownMenuItem asChild className="rounded-lg"><Link to="/admin/logs"><Activity className="mr-2.5 h-4 w-4" />Logs</Link></DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={adminLogout} className="rounded-lg text-red-600 focus:text-red-600"><LogOut className="mr-2.5 h-4 w-4" />Exit admin mode</DropdownMenuItem>
					</>
				) : (
					<DropdownMenuItem asChild className={compact ? 'rounded-lg p-2' : 'rounded-xl p-3'}>
						<Link to="/admin" className="flex items-start">
							<span className={compact ? 'mr-2 rounded-md bg-violet-100 p-1 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : 'mr-2.5 mt-0.5 rounded-lg bg-violet-100 p-1.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300'}><ShieldCheck className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} /></span>
							<span><span className="block font-medium">Admin access</span><span className={compact ? 'block text-[10px] font-normal text-muted-foreground' : 'block text-xs font-normal text-muted-foreground'}>Sign in to manage Deals24</span></span>
						</Link>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const popularSearches = [
		'AC',
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
	];

	return (
		<header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-md border-b border-gray-200 dark:border-[#27272A]">
			<div className="container mx-auto px-2 sm:px-4">
				<div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4">
					<div className="flex items-center flex-shrink-0">
						<Link to="/" className="flex items-center">
							{/* <Target className="h-8 w-8 mr-2" /> */}
							<img
								src="/favicon.ico"
								alt="Deals24"
								className="size-8 sm:size-10 mr-1 sm:mr-2 rounded-full"
								onError={(e) => {
									e.currentTarget.style.display = 'none';
									document
										.querySelector('.fallback-icon')
										?.setAttribute('style', 'display: block');
								}}
							/>
							<Target className="h-8 w-8 mr-1 sm:mr-2 fallback-icon hidden" />

							<span className="hidden sm:inline text-xl sm:text-3xl font-bold dark:text-white">
								Deals24
							</span>
						</Link>
					</div>

					<div className="min-w-0 w-0 flex-1 mx-1 sm:mx-4 max-w-xl">
						<form onSubmit={handleSearch} className="relative min-w-0">
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
											type="text"
											placeholder={
												isMobile
													? 'Search...'
													: 'Search deals... (Press Ctrl+K)'
											}
											className="min-w-0 w-full placeholder:text-[13px] text-sm sm:pl-10 pr-4 py-2 border rounded-full focus:outline-none dark:bg-apple-darkGray dark:border-gray-700 dark:text-white dark:placeholder-gray-400 truncate"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											onClick={() => setIsSearchPopoverOpen(true)}
										/>
										<Search className="absolute hidden sm:block left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
										<Button
											type="submit"
											size="icon"
											variant="ghost"
											className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700"
											onClick={() => handleSearch()}>
											<div className="relative flex items-center justify-center h-full">
												{isMobile ? (
													<Search className="h-5 w-5" />
												) : (
													<>
														<CommandIcon className="w-3 h-3" />
														<span className="text-sm mt-0.5">K</span>
													</>
												)}
											</div>
										</Button>
									</div>
								</PopoverTrigger>
								<PopoverContent
									className="mt-1 w-[calc(100vw-1.5rem)] max-w-80 rounded-lg p-1.5 sm:w-[var(--radix-popover-trigger-width)] sm:max-w-none sm:rounded-xl sm:p-2 min-[1025px]:w-96 min-[1025px]:max-w-96 dark:bg-apple-darkGray dark:border-gray-700"
									collisionPadding={12}
									sideOffset={5}>
									<div className="space-y-1.5 sm:space-y-2">
										<h3 className="px-1.5 text-xs font-medium text-apple-darkGray sm:px-2 sm:text-sm dark:text-gray-300 active:scale-95 transition-transform duration-150 ease-in-out">
											Popular searches
										</h3>
										<div className="flex flex-wrap gap-1.5 p-0.5 sm:gap-2 sm:p-1">
											{popularSearches.map((search) => (
												<button
													key={search}
													onClick={() => handlePopularSearch(search)}
													className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-apple-darkGray transition-colors hover:bg-gray-200 sm:px-3 sm:py-1.5 sm:text-xs dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
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
						<div className="flex items-center gap-2">
							<Link to="/wishlist">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-sm rounded-full dark:border-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800">
									<WishlistAlertIcon />
								</Button>
							</Link>
							<ThemeToggle />
							{renderAccountMenu(true)}
						</div>
					) : (
						<div className="flex items-center gap-2 ml-auto pr-1">
							<Link to="/deals">
								<Button
									variant="ghost"
									size="sm"
									className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out text-sm rounded-full dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800">
									<ShoppingBag className="h-5 w-5 mr-1" />
									<span>Deals</span>
								</Button>
							</Link>
							<Link to="/categories">
								<Button
									variant="ghost"
									size="sm"
									className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out text-sm rounded-full dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800">
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
									className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-in-out text-sm rounded-full dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800">
									<WishlistAlertIcon className="mr-1" />
									<span>Wishlist & Alerts</span>
								</Button>
							</Link>
							<ThemeToggle />
							{renderAccountMenu()}
						</div>
					)}
				</div>
			</div>
			<AuthDialog open={isAuthOpen} onOpenChange={setIsAuthOpen} />
			<AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
				<AlertDialogContent
					onOpenAutoFocus={(event) => event.preventDefault()}
					className="w-[calc(100%-2rem)] overflow-hidden rounded-3xl border-violet-200 p-0 shadow-2xl sm:max-w-md dark:border-violet-950">
					<div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-6 pb-7 pt-8 text-center text-white">
						<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25 backdrop-blur">
							<LogOut className="h-6 w-6" />
						</div>
						<AlertDialogHeader className="space-y-2 text-center sm:text-center">
							<AlertDialogTitle className="text-2xl text-white">Sign out of Deals24?</AlertDialogTitle>
							<AlertDialogDescription className="text-sm leading-6 text-violet-100">
								You’ll need another secure email link to access your synced wishlist and alerts on this browser.
							</AlertDialogDescription>
						</AlertDialogHeader>
					</div>
					<div className="space-y-5 px-6 pb-6 pt-5">
						<div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-zinc-900/70">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
								<ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
							<div className="min-w-0">
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400">Signed in as</p>
								<p className="truncate text-sm font-semibold">{user?.email}</p>
							</div>
						</div>
						<p className="text-center text-xs leading-5 text-gray-500 dark:text-gray-400">
							Your saved data will remain safely stored in your account.
						</p>
						<AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
							<AlertDialogCancel className="mt-0 h-11 rounded-full">Stay signed in</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => void signOut()}
								className="h-11 rounded-full bg-red-600 text-white hover:bg-red-700">
								Sign out
							</AlertDialogAction>
						</AlertDialogFooter>
					</div>
				</AlertDialogContent>
			</AlertDialog>
		</header>
	);
};

export default Navbar;
