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
  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label htmlFor="price-alert-toggle" className="text-sm font-medium">Set a target price</Label>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Optional — notify only at or below this price
        </p>
      </div>
      <Switch
        id="price-alert-toggle"
        checked={enabled}
        onCheckedChange={onEnabledChange}
        className="data-[state=checked]:bg-blue-700 focus-visible:ring-blue-600 dark:data-[state=checked]:bg-blue-600"
      />
    </div>
    {enabled && (
      <div className="relative mt-3">
        <IndianRupee aria-hidden="true" strokeWidth={1.5} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="number"
          min="1"
          inputMode="numeric"
          value={price}
          onChange={(event) => onPriceChange(event.target.value)}
          placeholder="Your target price"
          className="h-12 rounded-lg pl-10 text-base"
          required
        />
      </div>
    )}
  </div>
);

export default PriceAlertFields;
