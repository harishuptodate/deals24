
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'shimmer' | 'pulse';
  shape?: 'rectangle' | 'circle' | 'text';
}

function EnhancedSkeleton({
  className,
  variant = 'shimmer',
  shape = 'rectangle',
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-muted";
  
  const variantClasses = {
    default: "animate-pulse",
    shimmer: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
    pulse: "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
  };

  const shapeClasses = {
    rectangle: "rounded-md",
    circle: "rounded-full",
    text: "rounded-sm h-4"
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        shapeClasses[shape],
        className
      )}
      {...props}
    />
  );
}

export { EnhancedSkeleton };
