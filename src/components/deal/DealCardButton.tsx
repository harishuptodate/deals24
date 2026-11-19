
import React from 'react';
import { Button } from '@/components/ui/button';
import { trackMessageClick } from '../../services/api';
import { extractFirstLink, extractSecondLink } from './utils/linkUtils';

interface DealCardButtonProps {
  description: string;
  link: string;
  id?: string;
  hasMultipleLinks: boolean;
}

const DealCardButton = ({ description, link, id, hasMultipleLinks }: DealCardButtonProps) => {
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id) void trackMessageClick(id);
  };

  const fallbackLink = hasMultipleLinks
    ? extractSecondLink(description)
    : extractFirstLink(description);
  const primaryLink = link || fallbackLink || '#';

  return (
    <div className="mt-auto pt-3 flex-shrink-0">
      <Button asChild variant="dealPrimary" className="w-full px-6">
        <a
          href={primaryLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
        >
          Buy Now
        </a>
      </Button>
    </div>
  );
};

export default DealCardButton;
