import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface ClearAllConfirmDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	itemCount: number;
}

const ClearAllConfirmDialog = ({
	isOpen,
	onOpenChange,
	onConfirm,
	itemCount,
}: ClearAllConfirmDialogProps) => {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
				{/* Close button top-right */}
				<DialogClose asChild>
					<button
						className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
						aria-label="Close"></button>
				</DialogClose>

				<DialogHeader>
					<DialogTitle>Clear All Items?</DialogTitle>
					<DialogDescription>
						This will permanently remove all {itemCount}{' '}
						{itemCount === 1 ? 'item' : 'items'} from your wishlist. This action
						cannot be undone.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<DialogClose asChild>
						<button className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
							Cancel
						</button>
					</DialogClose>
					<button
						onClick={() => {
							onConfirm();
							onOpenChange(false);
						}}
						className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white">
						Clear All
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ClearAllConfirmDialog;
