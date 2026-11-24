import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { trackMessageClick } from '../../services/api';
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
import { Link } from 'react-router-dom';
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
						e.stopPropagation();
						if (id) void trackMessageClick(id);
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
				className="h-auto w-auto max-h-32 max-w-full rounded-xl object-contain sm:max-h-40 [&_img]:h-auto [&_img]:w-auto [&_img]:max-h-32 [&_img]:max-w-full [&_img]:rounded-xl sm:[&_img]:max-h-40"
				fallbackClassName="h-32 w-32 border-0 sm:h-40 sm:w-40"
			/>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				closeButtonClassName={buttonVariants({ variant: 'ghost', size: 'icon', className: 'right-2 top-2' })}
				className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[480px] flex-col gap-0 overflow-hidden rounded-xl p-0 text-[0.93rem] sm:max-h-[90dvh] sm:max-w-[520px] sm:text-sm [@media(max-height:500px)]:overflow-y-auto">
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-3 sm:px-5 [@media(max-height:500px)]:flex-none">
					<div className="mx-auto mb-4 w-fit max-w-full overflow-hidden rounded-xl">{renderImage()}</div>

					<Collapsible
						open={areDetailsOpen}
						onOpenChange={setAreDetailsOpen}
						className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
						{remainingDescription ? (
							<CollapsibleTrigger asChild>
								<button
									type="button"
									aria-label={areDetailsOpen ? 'Hide deal details' : 'Show deal details'}
									className="flex w-full items-start gap-2 px-3.5 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none sm:px-4 sm:py-3">
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
				</div>

				<div className="min-w-0 w-full shrink-0 px-4 pb-3 sm:px-5">
					<PriceHistoryChart dealId={id} enabled={isOpen} />
				</div>

				<DialogFooter className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-background/95 p-3 backdrop-blur-sm sm:grid-cols-4 sm:space-x-0">
					{id && (
						<Button asChild variant="dealOutline" className="w-full px-3 text-[13px]">
							<Link to={`/deal/${id}`} onClick={() => onOpenChange(false)}>
								<ExternalLink aria-hidden="true" />
								View Deal
							</Link>
						</Button>
					)}
					{buyNowLink && (
						<Button asChild variant="dealPrimary" className="w-full px-3 text-[13px]">
							<a
								href={buyNowLink}
								onClick={(event) => {
									event.stopPropagation();
									if (id) void trackMessageClick(id);
								}}
								target="_blank"
								rel="noopener noreferrer">
								<ShoppingCart aria-hidden="true" />
								Buy Now
							</a>
						</Button>
					)}
					<button type="button"
						onClick={handleShare}
						disabled={isSharing}
						aria-busy={isSharing}
						className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border-0 bg-transparent px-3 text-[13px] font-medium text-blue-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 dark:text-blue-400 dark:hover:bg-gray-800">
						<Share2 aria-hidden="true" className="h-4 w-4" />
						{isSharing ? 'Sharing...' : 'Share Deal'}
					</button>
					<DialogClose asChild>
						<Button
							type="button"
							variant="dealTertiary"
							className="w-full px-3 text-[13px]">
							<X aria-hidden="true" />
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DealDetailDialog;
