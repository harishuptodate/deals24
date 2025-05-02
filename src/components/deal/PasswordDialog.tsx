
import React from 'react';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  password: string;
  setPassword: (password: string) => void;
  error: string;
  setError: (error: string) => void;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const PasswordDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  password,
  setPassword,
  error,
  setError,
  title,
  description,
  icon = <Lock className="h-5 w-5 text-red-500" />
}: PasswordDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-w-[90vw] w-[90vw] sm:w-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="mt-4 space-y-4">
            <p className="text-sm">{description}</p>
            
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
            />
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim()}
              variant={title.includes("Delete") ? "destructive" : "default"}>
              Verify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordDialog;
