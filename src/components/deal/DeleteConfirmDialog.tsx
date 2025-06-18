import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface DeleteConfirmDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

const DeleteConfirmDialog = ({
	isOpen,
	onOpenChange,
	onConfirm,
}: DeleteConfirmDialogProps) => {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
				<DialogHeader>
					<DialogTitle>Are you sure?</DialogTitle>
					<DialogDescription>
						This will permanently delete this deal. This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="flex flex-row flex-nowrap justify-between items-center gap-4">
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
						Delete
					</button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteConfirmDialog;
