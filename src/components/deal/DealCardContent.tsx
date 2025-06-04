
import React from 'react';
import { format } from 'date-fns';

interface DealCardContentProps {
  title: string;
  description: string;
  createdAt?: string;
}

const DealCardContent = ({ title, description, createdAt }: DealCardContentProps) => {
  const formattedDate = createdAt
    ? format(new Date(createdAt), 'MMM d, h:mm a')
    : '';

  return (
    <div className="space-y-3 flex-1 flex flex-col">
      <div className="space-y-2">
        {formattedDate && (
          <div className="flex items-center">
            <span className="time-badge">
              {formattedDate}
            </span>
          </div>
        )}
        <h3 className="text-lg font-semibold text-high-contrast line-clamp-2 leading-tight">
          {title}
        </h3>
      </div>

      <div className="flex-1">
        <p className="text-sm text-medium-contrast line-clamp-5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default DealCardContent;
