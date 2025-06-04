
import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface IllustratedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
  children?: React.ReactNode;
}

const IllustratedEmptyState = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  illustration,
  children
}: IllustratedEmptyStateProps) => {
  return (
    <div className="text-center py-16 px-6">
      <div className="max-w-md mx-auto">
        {/* Illustration or Icon */}
        <div className="mb-6">
          {illustration || (
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800/50">
              <Icon className="h-10 w-10 text-gray-400 dark:text-gray-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {actionText && onAction && (
            <Button onClick={onAction} className="w-full sm:w-auto">
              {actionText}
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default IllustratedEmptyState;
