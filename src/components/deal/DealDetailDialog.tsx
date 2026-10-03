import React, { useState } from 'react';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { handleTrackedLinkClick } from '../../services/api';
import {
	ExternalLink,
	Share2,
	Calendar,
	MousePointer,
	Tag,
} from 'lucide-react';
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
import { format } from 'date-fns';
import PriceHistoryChart from './PriceHistoryChart';

interface DealDetailDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	link?: string;
	id?: string;
	category?: string;
	price?: string;
	imageUrl?: string;
	telegramFileId?: string;
	extraData?: {	
		createdDate?: string;
		clicks?: number;
		category?: string;
	};
}

const DealDetailDialog = ({
	isOpen,
	onOpenChange,
	title,
	description,
	link,
	id,
	category,
	price,
	imageUrl,
	telegramFileId,
	extraData,
}: DealDetailDialogProps) => {
	const { toast } = useToast();
	const [isSharing, setIsSharing] = useState(false);
	const navigate = useNavigate();
	const buyNowLink = link || extractSecondLink(description) || extractFirstLink(description);

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
						handleTrackedLinkClick(part, id, e.nativeEvent);
						if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
							e.preventDefault();
							e.stopPropagation();
							setTimeout(() => window.open(part, '_blank'), 100);
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
				category={category || extraData?.category}
				imageUrl={imageUrl}
				telegramFileId={telegramFileId}
				className="w-full h-44 sm:h-48 object-contain rounded-lg"
			/>
		);
	};

	const formatCreatedDate = (dateString?: string) => {
		if (!dateString) return '';
		try {
			return format(new Date(dateString), 'MMM d, yyyy h:mm a');
		} catch {
			return dateString;
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 text-sm sm:max-h-[92vh] dark:border-slate-800">
				<DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 pr-12 text-left sm:px-6 sm:py-4 dark:border-slate-800">
					<DialogTitle className="line-clamp-2 text-base leading-6 sm:text-lg">
						{title}
					</DialogTitle>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
					<div className="mx-auto mb-4 max-w-xl">{renderImage()}</div>

					<div className="whitespace-pre-line rounded-2xl bg-slate-50 px-3.5 py-3 text-[13px] leading-6 text-slate-700 sm:px-5 sm:py-4 sm:text-sm dark:bg-slate-900 dark:text-slate-300">
						<span className="font-semibold text-slate-950 dark:text-white">{makeLinksClickable(description.split('\n')[0])}</span>
						{description.split('\n').slice(1).length > 0 && (
							<>
								{'\n'}
								{makeLinksClickable(description.split('\n').slice(1).join('\n'))}
							</>
						)}
					</div>

					<div className="mt-4">
						<PriceHistoryChart dealId={id} enabled={isOpen} currentPrice={price} />
					</div>

				{extraData && (
					<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
						<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
							Deal Information
						</h4>
						<div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
							{extraData.createdDate && (
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-gray-500" />
									<span className="font-medium">Created:</span>
									<span>{formatCreatedDate(extraData.createdDate)}</span>
								</div>
							)}
							{typeof extraData.clicks === 'number' && (
								<div className="flex items-center gap-2">
									<MousePointer className="h-4 w-4 text-gray-500" />
									<span className="font-medium">Clicks:</span>
									<span>{extraData.clicks}</span>
								</div>
							)}
							{extraData.category && (
								<div className="flex items-center gap-2">
									<Tag className="h-4 w-4 text-gray-500" />
									<span className="font-medium">Category:</span>
									<span>{extraData.category}</span>
								</div>
							)}
						</div>
					</div>
				)}
				</div>

				<DialogFooter className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3 sm:grid-cols-4 sm:gap-3 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-950">
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
							className="col-span-2 flex h-12 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 sm:col-span-1 dark:bg-emerald-600 dark:hover:bg-emerald-500">
							Buy now
							<ExternalLink className="ml-2 h-4 w-4" />
						</a>
					)}
					{id && (
						<Button
							variant="outline"
							onClick={handleViewFullPage}
							className="h-11 rounded-xl px-3 text-xs font-semibold sm:h-12 sm:text-sm">
							<ExternalLink className="mr-1.5 h-4 w-4" />
							View deal
						</Button>
					)}
					<Button
						variant="outline"
						onClick={handleShare}
						disabled={isSharing}
						className="h-11 rounded-xl px-3 text-xs font-semibold sm:h-12 sm:text-sm">
						<Share2 className="mr-1.5 h-4 w-4" />
						{isSharing ? 'Sharing...' : 'Share deal'}
					</Button>
					<DialogClose asChild>
						<Button
							type="button"
							variant="ghost"
							className="col-span-2 h-11 rounded-xl text-xs font-semibold text-slate-600 sm:col-span-1 sm:h-12 sm:text-sm dark:text-slate-300">
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DealDetailDialog;
