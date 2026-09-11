import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus, ShieldBan, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  addBlacklistEntry,
  getBlacklistEntries,
  removeBlacklistEntry,
  type BlacklistEntry,
  type BlacklistEntryType,
} from '@/services/api';

type BlacklistColumnProps = {
  type: BlacklistEntryType;
  title: string;
  description: string;
  entries: BlacklistEntry[];
  busyId: string | null;
  onAdd: (type: BlacklistEntryType, value: string) => Promise<void>;
  onRemove: (entry: BlacklistEntry) => Promise<void>;
};

function BlacklistColumn({
  type,
  title,
  description,
  entries,
  busyId,
  onAdd,
  onRemove,
}: BlacklistColumnProps) {
  const [value, setValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(type, value);
      setValue('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={100}
            placeholder={`Add ${type}`}
            aria-label={`Add blacklisted ${type}`}
          />
          <Button type="submit" disabled={isAdding || !value.trim()}>
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="sr-only">Add {type}</span>
          </Button>
        </form>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No {title.toLowerCase()} configured.
            </p>
          ) : entries.map((entry) => (
            <div key={entry._id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <span className="min-w-0 truncate text-sm">{entry.value}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busyId === entry._id}
                onClick={() => onRemove(entry)}
                aria-label={`Remove ${entry.value}`}
              >
                {busyId === entry._id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BlacklistManager() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getBlacklistEntries()
      .then(setEntries)
      .catch(() => toast({
        title: 'Could not load blacklist',
        description: 'Please refresh and try again.',
        variant: 'destructive',
      }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const handleAdd = async (type: BlacklistEntryType, value: string) => {
    try {
      const entry = await addBlacklistEntry(type, value.trim());
      setEntries((current) => [...current, entry]);
      toast({ title: 'Blacklist updated', description: `${entry.value} was added.` });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error
        : 'Failed to add the blacklist entry.';
      toast({
        title: 'Could not add entry',
        description: message || 'Failed to add the blacklist entry.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleRemove = async (entry: BlacklistEntry) => {
    setBusyId(entry._id);
    try {
      await removeBlacklistEntry(entry._id);
      setEntries((current) => current.filter((item) => item._id !== entry._id));
      toast({ title: 'Blacklist updated', description: `${entry.value} was removed.` });
    } catch (_error) {
      toast({
        title: 'Could not remove entry',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <ShieldBan className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Deal blacklist</CardTitle>
            <CardDescription>
              Deals are rejected when their text matches both a listed brand and product keyword.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <BlacklistColumn
              type="brand"
              title="Brands"
              description="Brand names that participate in the rejection rule."
              entries={entries.filter((entry) => entry.type === 'brand')}
              busyId={busyId}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
            <BlacklistColumn
              type="product"
              title="Products"
              description="Product keywords that participate in the rejection rule."
              entries={entries.filter((entry) => entry.type === 'product')}
              busyId={busyId}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
