import { Trash2 } from 'lucide-react';
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

interface ClearAllConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount: number;
}

const ClearAllConfirmDialog = ({ isOpen, onOpenChange, onConfirm, itemCount }: ClearAllConfirmDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent
      onOpenAutoFocus={(event) => event.preventDefault()}
      className="w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
        <Trash2 className="h-5 w-5 text-red-600" />
      </div>
      <AlertDialogHeader className="text-center sm:text-center">
        <AlertDialogTitle>Clear your entire wishlist?</AlertDialogTitle>
        <AlertDialogDescription className="leading-6">
          This permanently removes all {itemCount} {itemCount === 1 ? 'deal' : 'deals'} from your wishlist.{' '}
          Your alerts will remain unchanged.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
        <AlertDialogCancel className="mt-0 h-11 rounded-full">Keep wishlist</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="h-11 rounded-full bg-red-600 text-white hover:bg-red-700">Clear wishlist</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ClearAllConfirmDialog;
