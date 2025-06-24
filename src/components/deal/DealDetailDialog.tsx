import React, { useState } from 'react';
import {
	Dialog,
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
import CachedTelegramImage from '../images/CachedTelegramImage';
import { format } from 'date-fns';

interface DealDetailDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	id?: string;
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
	id,
	imageUrl,
	telegramFileId,
	extraData,
}: DealDetailDialogProps) => {
	const { toast } = useToast();
	const [isSharing, setIsSharing] = useState(false);
	const navigate = useNavigate();

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
		if (imageUrl) {
			return (
				<img
					src={imageUrl}
					alt={title}
					className="w-full h-44 sm:h-48 object-contain rounded-lg"
					onError={(e) => (e.currentTarget.style.display = 'none')}
				/>
			);
		}
		if (telegramFileId) {
			return (
				<CachedTelegramImage
					telegramFileId={telegramFileId}
					alt={title}
					className="w-full h-44 sm:h-48 rounded-lg"
				/>
			);
		}
		return null;
	};

	const formatCreatedDate = (dateString?: string) => {
		if (!dateString) return '';
		try {
			return format(new Date(dateString), 'MMM d, yyyy h:mm a');
		} catch {
			return dateString;
		}
	};

	const hasImage = imageUrl || telegramFileId;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-[92vw] sm:w-[480px] max-h-[95vh] overflow-y-auto rounded-xl text-[0.93rem] sm:text-sm px-4 sm:px-6">
				<DialogHeader>
					<DialogTitle className="text-base sm:text-lg text-center">
						{title}
					</DialogTitle>
				</DialogHeader>

				<div className="mt-3">
					{hasImage && <div className="mb-4">{renderImage()}</div>}

					<div className="text-sm whitespace-pre-line text-center">
						{makeLinksClickable(description)}
					</div>
				</div>

				<DialogFooter className="mt-4 flex flex-row flex-wrap justify-between gap-3">
					{id && (
						<Button
							onClick={handleViewFullPage}
							className="w-full sm:w-auto flex-1 dark:text-white bg-blue-600 dark:bg-blue-800 hover:bg-blue-700 hover:dark:bg-blue-900 hover:scale-105 rounded-full transition-all">
							<ExternalLink size={16} />
							View Deal
						</Button>
					)}

					{extractFirstLink(description || '') && (
						<a
							href={
								extractSecondLink(description || '') ||
								extractFirstLink(description || '') ||
								'#'
							}
							onClick={(e) =>
								handleTrackedLinkClick(
									extractSecondLink(description || '') ||
										extractFirstLink(description || '') ||
										'',
									id,
									e.nativeEvent,
								)
							}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full sm:w-auto flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-b from-apple-darkGray to-indigo-950 rounded-full hover:scale-105 transition-all">
							Buy Now
						</a>
					)}

					<Button
						onClick={handleShare}
						disabled={isSharing}
						className="w-full sm:w-auto flex-1 dark:text-white rounded-full bg-orange-500 dark:bg-orange-800 hover:bg-orange-600 hover:dark:bg-orange-900 hover:scale-105 transition-all">
						<Share2 size={16} />
						{isSharing ? 'Sharing...' : 'Share Deal'}
					</Button>
				</DialogFooter>

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
			</DialogContent>
		</Dialog>
	);
};

export default DealDetailDialog;
