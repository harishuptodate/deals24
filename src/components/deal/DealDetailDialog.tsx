import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { handleTrackedLinkClick } from '../../services/api';
import {
	ChevronDown,
	ExternalLink,
	Share2,
	ShoppingCart,
	X,
} from 'lucide-react';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
	shareContent,
	copyToClipboard,
	truncateLink,
	extractFirstLink,
	extractSecondLink,
} from './utils/linkUtils';
import { useNavigate } from 'react-router-dom';
import DealImage from '../images/DealImage';
import PriceHistoryChart from './PriceHistoryChart';

interface DealDetailDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	link?: string;
	id?: string;
	category?: string;
	imageUrl?: string;
	telegramFileId?: string;
}

const DealDetailDialog = ({
	isOpen,
	onOpenChange,
	title,
	description,
	link,
	id,
	category,
	imageUrl,
	telegramFileId,
}: DealDetailDialogProps) => {
	const { toast } = useToast();
	const [isSharing, setIsSharing] = useState(false);
	const [areDetailsOpen, setAreDetailsOpen] = useState(false);
	const navigate = useNavigate();
	const buyNowLink = link || extractSecondLink(description) || extractFirstLink(description);
	const [descriptionHeadline = '', ...descriptionLines] = description.split('\n');
	const remainingDescription = descriptionLines.join('\n').trim();

	useEffect(() => {
		if (!isOpen) setAreDetailsOpen(false);
	}, [isOpen]);

	const handleShare = async () => {
		setIsSharing(true);
		try {
			const shareUrl = id
				? `${window.location.origin}/deal/${id}`
				: window.location.href;
			const shareText = `Check out this deal: ${title.slice(0, 60)}${
				title.length > 60 ? '...' : ''
			}`;
			const shareData = {
				title: title || 'Check out this deal!',
				text: shareText,
				url: shareUrl,
			};
			const shared = await shareContent(shareData);
			if (!shared) {
				const textToCopy = `${shareText}\n${shareUrl}`;
				const copied = await copyToClipboard(textToCopy);
				if (copied) {
					toast({
						title: 'Copied to clipboard!',
						description: 'Deal link copied for sharing.',
					});
				}
			}
		} catch (error) {
			toast({
				title: 'Sharing failed',
				description: 'Something went wrong while trying to share.',
				variant: 'destructive',
			});
		} finally {
			setIsSharing(false);
		}
	};

	const handleViewFullPage = () => {
		if (id) {
			onOpenChange(false);
			navigate(`/deal/${id}`);
		}
	};

	const makeLinksClickable = (text: string) => {
		if (!text) return '';
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		const parts = text.split(urlRegex);
		return parts.map((part, i) =>
			part.match(urlRegex) ? (
				<a
					key={i}
					href={part}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => {
						void handleTrackedLinkClick(part, id, e.nativeEvent);
						if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
							e.preventDefault();
							e.stopPropagation();
						}
					}}
					className="text-blue-600 hover:underline break-all inline-flex items-center gap-1">
					{truncateLink(part)} <ExternalLink size={12} />
				</a>
			) : (
				<span key={i}>{part}</span>
			),
		);
	};

	const renderImage = () => {
		return (
			<DealImage
				title={title}
				category={category}
				imageUrl={imageUrl}
				telegramFileId={telegramFileId}
				className="h-32 w-full rounded-lg object-contain sm:h-40"
			/>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden rounded-xl p-0 text-[0.93rem] sm:max-h-[90dvh] sm:max-w-[520px] sm:text-sm">
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3 sm:px-5">
					<div className="mb-4">{renderImage()}</div>

					<Collapsible
						open={areDetailsOpen}
						onOpenChange={setAreDetailsOpen}
						className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
						{remainingDescription ? (
							<CollapsibleTrigger asChild>
								<button
									type="button"
									aria-label={areDetailsOpen ? 'Hide deal details' : 'Show deal details'}
									className="flex w-full items-start gap-2 px-3.5 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-4 sm:py-3">
									<span className="min-w-0 flex-1 text-center text-sm font-semibold leading-5 text-foreground">
										{descriptionHeadline || title}
									</span>
									<span className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground">
										<ChevronDown
											className={cn(
												'h-4 w-4 transition-transform duration-200',
												areDetailsOpen && 'rotate-180',
											)}
										/>
									</span>
								</button>
							</CollapsibleTrigger>
						) : (
							<p className="px-3.5 py-2.5 text-center text-sm font-semibold leading-5 text-foreground sm:px-4 sm:py-3">
								{makeLinksClickable(descriptionHeadline || title)}
							</p>
						)}

						{remainingDescription && (
							<CollapsibleContent className="data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
								<div className="whitespace-pre-line border-t border-border/60 bg-muted/15 px-3.5 py-3 text-center text-[13px] leading-6 text-muted-foreground sm:px-4 sm:text-sm">
									{makeLinksClickable(remainingDescription)}
								</div>
							</CollapsibleContent>
						)}
					</Collapsible>

					<div className="mt-4 min-w-0 w-full overflow-hidden">
						<PriceHistoryChart dealId={id} enabled={isOpen} />
					</div>
				</div>

				<DialogFooter className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-border bg-background/95 p-2 backdrop-blur-sm sm:grid-cols-4 sm:space-x-0">
					{id && (
						<Button
							onClick={handleViewFullPage}
							className="order-1 h-9 w-full max-w-36 justify-self-center rounded-full bg-blue-600 px-2 text-[11px] text-white transition-all hover:scale-[1.02] hover:bg-blue-700 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:max-w-none sm:text-xs dark:bg-blue-800 dark:text-white dark:hover:bg-blue-900">
							<ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							View Deal
						</Button>
					)}
					{buyNowLink && (
						<a
							href={buyNowLink}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void handleTrackedLinkClick(buyNowLink, id, event.nativeEvent);
							}}
							target="_blank"
							rel="noopener noreferrer"
							className="order-3 flex h-9 w-full max-w-36 items-center justify-center gap-1.5 justify-self-center rounded-full bg-gradient-to-b from-apple-darkGray to-indigo-950 px-2 text-[11px] font-medium text-white transition-all hover:scale-[1.02] sm:order-2 sm:max-w-none sm:text-xs">
							<ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							Buy Now
						</a>
					)}
					<Button
						onClick={handleShare}
						disabled={isSharing}
						className="order-4 h-9 w-full max-w-36 justify-self-center rounded-full bg-orange-500 px-2 text-[11px] text-white transition-all hover:scale-[1.02] hover:bg-orange-600 sm:order-3 sm:max-w-none sm:text-xs dark:bg-orange-800 dark:text-white dark:hover:bg-orange-900">
						<Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
						{isSharing ? 'Sharing...' : 'Share Deal'}
					</Button>
					<DialogClose asChild>
						<Button
							type="button"
							className="order-2 h-9 w-full max-w-36 justify-self-center rounded-full bg-red-600 px-2 text-[11px] text-white transition-all hover:scale-[1.02] hover:bg-red-700 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:order-4 sm:max-w-none sm:text-xs dark:bg-red-800 dark:text-white dark:hover:bg-red-900">
							<X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DealDetailDialog;
