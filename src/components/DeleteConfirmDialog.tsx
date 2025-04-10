
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Lock } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "This action cannot be undone. Are you sure you want to delete this item?"
}) => {
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  
  // Get the deletion password from environment variables
  const deletionPassword = import.meta.env.VITE_DELETION_PASSWORD || "admin123";
  
  const handleConfirm = () => {
    if (password === deletionPassword) {
      onConfirm();
      setPassword("");
      onClose();
    } else {
      toast({
        title: "Incorrect Password",
        description: "The password you entered is incorrect.",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="flex items-center gap-2 my-4 border p-3 rounded-md bg-gray-50">
          <Lock className="h-4 w-4 text-gray-500" />
          <Input
            type="password"
            placeholder="Enter password to confirm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 shadow-none"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
