
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TouchOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onTap?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

const TouchOptimizedCard = ({ 
  children, 
  className, 
  onTap, 
  onLongPress, 
  disabled = false 
}: TouchOptimizedCardProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress();
        setIsPressed(false);
      }, 500); // 500ms for long press
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    
    setIsPressed(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (onTap) {
      onTap();
    }
  };

  const handleTouchCancel = () => {
    setIsPressed(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-150 cursor-pointer select-none",
        "touch-manipulation", // Optimize for touch
        isPressed && !disabled && "scale-[0.98] opacity-90",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchCancel}
      style={{
        WebkitTapHighlightColor: 'transparent' // Remove iOS tap highlight
      }}
    >
      {children}
    </div>
  );
};

export default TouchOptimizedCard;
