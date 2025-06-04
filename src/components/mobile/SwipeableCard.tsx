
import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  swipeThreshold?: number;
}

const SwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className,
  swipeThreshold = 100 
}: SwipeableCardProps) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const diff = currentX - startX;
    const absThreshold = Math.abs(diff);
    
    if (absThreshold > swipeThreshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  const translateX = isDragging ? currentX - startX : 0;
  const opacity = isDragging ? Math.max(0.7, 1 - Math.abs(translateX) / 200) : 1;

  return (
    <div
      ref={cardRef}
      className={cn("touch-manipulation transition-all duration-200", className)}
      style={{
        transform: `translateX(${translateX}px)`,
        opacity
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default SwipeableCard;
