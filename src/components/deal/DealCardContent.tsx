
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
    <div className="space-y-2 flex-1 flex flex-col">
      <div className="space-y-1">
        {formattedDate && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-gradient-to-r dark:to-gray-500 rounded-full text-apple-gray shadow-md">
            {formattedDate}
          </span>
        )}
        <h3 className="text-lg font-semibold text-apple-darkGray line-clamp-2">
          {title}
        </h3>
      </div>

      <div className="mt-1">
        <p className="text-sm text-apple-gray line-clamp-5 flex-grow">
          {description}
        </p>
      </div>
    </div>
  );
};

export default DealCardContent;
