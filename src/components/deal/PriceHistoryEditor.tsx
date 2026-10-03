import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  deleteDealPriceHistoryPoint,
  getDealPriceHistory,
  updateDealPriceHistoryPoint,
} from '@/services/api';
import type { PriceHistoryPoint } from '@/types/telegram';
import PriceDateTimeFields from './PriceDateTimeFields';

interface PriceHistoryEditorProps {
  dealId: string;
  enabled: boolean;
  onCurrentPriceChange: (price: number | null) => void;
}

const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(price);

export default function PriceHistoryEditor({
  dealId,
  enabled,
  onCurrentPriceChange,
}: PriceHistoryEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editedPrice, setEditedPrice] = useState('');
  const [editedDateTime, setEditedDateTime] = useState(new Date());
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['deal-price-history', dealId],
    queryFn: () => getDealPriceHistory(dealId),
    enabled: enabled && Boolean(dealId),
    staleTime: 0,
  });

  useEffect(() => {
    if (enabled) return;
    setEditingId(null);
    setDeletingId(null);
  }, [enabled]);

  const startEditing = (point: PriceHistoryPoint) => {
    setDeletingId(null);
    setEditingId(point.id);
    setEditedPrice(String(point.price));
    setEditedDateTime(new Date(point.observedAt));
  };

  const refreshHistory = async () => {
    await queryClient.invalidateQueries({ queryKey: ['deal-price-history', dealId] });
  };

  const savePoint = async () => {
    const numericPrice = Number(editedPrice);
    if (!editingId || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast({ title: 'Enter a valid price', variant: 'destructive' });
      return;
    }

    setBusyId(editingId);
    try {
      const result = await updateDealPriceHistoryPoint(
        dealId,
        editingId,
        numericPrice,
        editedDateTime.toISOString(),
      );
      onCurrentPriceChange(result.currentPrice);
      setEditingId(null);
      await refreshHistory();
      toast({ title: 'Price history updated' });
    } catch {
      toast({
        title: 'Could not update price history',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const deletePoint = async (pointId: string) => {
    setBusyId(pointId);
    try {
      const result = await deleteDealPriceHistoryPoint(dealId, pointId);
      onCurrentPriceChange(result.currentPrice);
      setDeletingId(null);
      if (editingId === pointId) setEditingId(null);
      await refreshHistory();
      toast({ title: 'Price history entry deleted' });
    } catch {
      toast({
        title: 'Could not delete price history',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-5 border-t border-border pt-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Price history</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Correct or remove previously recorded prices and dates.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.points.length ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          No price history has been recorded yet.
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {[...data.points].reverse().map((point) => (
            <div key={point.id} className="rounded-lg border border-border bg-muted/20 p-3">
              {editingId === point.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price</label>
                    <Input
                      value={editedPrice}
                      onChange={(event) => setEditedPrice(event.target.value.replace(/\D/g, ''))}
                      inputMode="numeric"
                      className="h-10"
                    />
                  </div>
                  <PriceDateTimeFields value={editedDateTime} onChange={setEditedDateTime} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="mr-1 h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={savePoint} disabled={busyId === point.id}>
                      {busyId === point.id
                        ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        : <Check className="mr-1 h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(point.price)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(point.observedAt), 'dd MMM yyyy, h:mm a')}
                    </p>
                  </div>
                  {deletingId === point.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="hidden text-xs text-muted-foreground sm:inline">Delete?</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePoint(point.id)}
                        disabled={busyId === point.id}
                      >
                        {busyId === point.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Delete'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditing(point)} aria-label="Edit price history entry">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingId(point.id)} aria-label="Delete price history entry">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
