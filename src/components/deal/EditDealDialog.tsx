import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateMessageText } from '../../services/api';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '../ui/input';
import { useQueryClient } from '@tanstack/react-query';
import PriceDateTimeFields from './PriceDateTimeFields';
import PriceHistoryEditor from './PriceHistoryEditor';

interface EditDealDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	id: string;
	initialText: string;
	initialImageUrl: string | null;
	initialPrice?: string | null;
	onSuccess: (
		id: string,
		newText: string,
		newImageUrl: string | null,
		newPrice: string | null,
	) => void;
}

const EditDealDialog = ({
	isOpen,
	onOpenChange,
	id,
	initialText,
	onSuccess,
	initialImageUrl,
	initialPrice = null,
}: EditDealDialogProps) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [editedText, setEditedText] = useState(initialText);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editedImageUrl, setEditedImageUrl] = useState(initialImageUrl || null);
	const [editedPrice, setEditedPrice] = useState(initialPrice ?? '');
	const [recordPriceHistory, setRecordPriceHistory] = useState(false);
	const [priceObservedAt, setPriceObservedAt] = useState(new Date());

	useEffect(() => {
		if (!isOpen) return;
		setEditedText(initialText);
		setEditedImageUrl(initialImageUrl || null);
		setEditedPrice(initialPrice ?? '');
		setRecordPriceHistory(false);
		setPriceObservedAt(new Date());
	}, [isOpen, initialText, initialImageUrl, initialPrice]);

	const handleSaveEdit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!id) return;
		if (editedImageUrl && !editedImageUrl.startsWith('https://m.media-amazon.com/')) {
			toast({
				title: 'Error',
				description: 'Invalid image URL',
				variant: 'destructive',
			});
			return;
		}
		if (editedPrice && !/^\d+$/.test(editedPrice)) {
			toast({
				title: 'Error',
				description: 'Price must contain only digits',
				variant: 'destructive',
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const success = await updateMessageText(
				id,
				editedText,
				editedImageUrl,
				editedPrice || null,
				recordPriceHistory ? priceObservedAt.toISOString() : null,
			);
			if (success) {
				if (recordPriceHistory) {
					void queryClient.invalidateQueries({ queryKey: ['deal-price-history', id] });
				}
				toast({
					title: 'Success',
					description: 'Deal was updated successfully',
				});
				onOpenChange(false);
				onSuccess(id, editedText, editedImageUrl, editedPrice || null);
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
			setIsSubmitting(false);
		}
	};

	// Handle Ctrl+Enter to submit
	const handleTextareaKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (e.ctrlKey && e.key === 'Enter') {
			e.currentTarget.form?.requestSubmit();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] w-[90vw] max-w-[90vw] overflow-y-auto rounded-xl p-[18px] [&>button]:right-3 [&>button]:top-3 [&>button_svg]:h-3 [&>button_svg]:w-3 sm:w-auto sm:max-w-[500px] sm:p-6 sm:[&>button]:right-4 sm:[&>button]:top-4 sm:[&>button_svg]:h-4 sm:[&>button_svg]:w-4">
				<div className="[zoom:0.75] sm:[zoom:1]">
					<DialogHeader>
						<DialogTitle>Edit Deal</DialogTitle>
					</DialogHeader>

					<form onSubmit={handleSaveEdit}>
					<div className="mt-4">
						<Textarea
							value={editedText}
							onChange={(e) => setEditedText(e.target.value)}
							onKeyDown={handleTextareaKeyDown}
							placeholder="Deal description"
							className="min-h-[200px]"
						/>
					</div>

					<div className="mt-4">
						<Input
							value={editedImageUrl}
							onChange={(e) => setEditedImageUrl(e.target.value)}
							placeholder="Image URL"
							className="min-h-[40px]"
							type="url"
						/>
					</div>
					<div className="mt-4">
						<Input
							value={editedPrice}
							onChange={(e) => {
								setEditedPrice(e.target.value);
								setRecordPriceHistory(e.target.value !== (initialPrice ?? ''));
							}}
							placeholder="Price (numbers only)"
							className="min-h-[40px]"
							type="text"
							inputMode="numeric"
						/>
					</div>

					<label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
						<input
							type="checkbox"
							checked={recordPriceHistory}
							onChange={(event) => setRecordPriceHistory(event.target.checked)}
							disabled={!editedPrice}
							className="h-4 w-4 rounded border-input"
						/>
						Add this price to price history
					</label>

					{recordPriceHistory && (
						<div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
							<p className="mb-2 text-sm font-medium">
								Price date and time
							</p>
							<PriceDateTimeFields value={priceObservedAt} onChange={setPriceObservedAt} />
						</div>
					)}

					<PriceHistoryEditor
						dealId={id}
						enabled={isOpen}
						onCurrentPriceChange={(price) => setEditedPrice(price ? String(price) : '')}
					/>

					<DialogFooter className="mt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !editedText.trim()}>
							{isSubmitting ? 'Saving...' : 'Save Changes'}
						</Button>
					</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default EditDealDialog;
