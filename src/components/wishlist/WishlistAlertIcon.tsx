import { Bell, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type WishlistAlertIconProps = {
  className?: string;
};

const WishlistAlertIcon = ({ className }: WishlistAlertIconProps) => (
  <span className={cn('relative inline-flex h-5 w-6 shrink-0', className)} aria-hidden="true">
    <Heart className="absolute bottom-0 left-0 h-[18px] w-[18px] animate-heartbeat" />
    <Bell className="absolute right-0 top-0 h-3.5 w-3.5 fill-background animate-shakeLift" strokeWidth={2.4} />
  </span>
);

export default WishlistAlertIcon;
