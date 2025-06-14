
import React from 'react';
import { handleTrackedLinkClick } from '../../services/api';
import { extractFirstLink, extractSecondLink } from './utils/linkUtils';

interface DealCardButtonProps {
  description: string;
  link: string;
  id?: string;
  hasMultipleLinks: boolean;
}

const DealCardButton = ({ description, link, id, hasMultipleLinks }: DealCardButtonProps) => {
  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    handleTrackedLinkClick(url, id, e.nativeEvent);

    if (e.ctrlKey || e.metaKey || e.button === 1) return;

    e.preventDefault();
    e.stopPropagation();

    setTimeout(() => {
      window.open(url, '_blank');
    }, 100);
  };

  const primaryLink = hasMultipleLinks 
    ? extractSecondLink(description) || '#'
    : link || extractFirstLink(description) || '#';

  return (
    <div className="mt-auto pt-3 flex-shrink-0">
      <a
        href={primaryLink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => handleLinkClick(primaryLink, e)}
        className="inline-block w-full text-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-b from-apple-darkGray to-indigo-950 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20 flex items-center justify-center"
      >
        Buy Now
      </a>
    </div>
  );
};

export default DealCardButton;
