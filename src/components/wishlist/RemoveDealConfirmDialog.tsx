import { HeartCrack } from 'lucide-react';
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

interface RemoveDealConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  dealTitle: string;
}

const RemoveDealConfirmDialog = ({ isOpen, onOpenChange, onConfirm, dealTitle }: RemoveDealConfirmDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent className="w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40">
        <HeartCrack className="h-5 w-5 text-rose-600" />
      </div>
      <AlertDialogHeader className="text-center sm:text-center">
        <AlertDialogTitle>Remove this saved deal?</AlertDialogTitle>
        <AlertDialogDescription className="leading-6">
          <span className="mb-1 block line-clamp-2 font-medium text-gray-700 dark:text-gray-200">{dealTitle}</span>
          The deal will leave your wishlist. Any alert created for it will stay active until you remove that alert separately.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
        <AlertDialogCancel className="mt-0 h-11 rounded-full">Keep deal</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="h-11 rounded-full bg-red-600 text-white hover:bg-red-700">Remove deal</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default RemoveDealConfirmDialog;
