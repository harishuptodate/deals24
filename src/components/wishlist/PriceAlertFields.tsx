import { IndianRupee } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type PriceAlertFieldsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  price: string;
  onPriceChange: (price: string) => void;
};

const PriceAlertFields = ({ enabled, onEnabledChange, price, onPriceChange }: PriceAlertFieldsProps) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-900/60">
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label htmlFor="price-alert-toggle" className="text-sm font-medium">Set a target price</Label>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Optional — notify only at or below this price
        </p>
      </div>
      <Switch id="price-alert-toggle" checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
    {enabled && (
      <div className="relative mt-3">
        <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          type="number"
          min="1"
          inputMode="numeric"
          value={price}
          onChange={(event) => onPriceChange(event.target.value)}
          placeholder="Your target price"
          className="h-11 pl-9"
          required
        />
      </div>
    )}
  </div>
);

export default PriceAlertFields;
