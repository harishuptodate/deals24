import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Pause, Play, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createAdminLogsStreamUrl, getAdminLogs, type AdminLogEntry } from '@/services/api';

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

interface AdminLogsPanelProps {
  enabled: boolean;
}

const levelBadgeVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'secondary',
  warn: 'outline',
  error: 'destructive',
  debug: 'default',
};

const formatTimestamp = (value: string) => {
  try {
    return new Date(value).toLocaleString('en-IN', {
      hour12: true,
    });
  } catch (_error) {
    return value;
  }
};

const getLogIdentity = (entry: AdminLogEntry) =>
  entry.id || entry._id || `${entry.timestamp}-${entry.level}-${entry.message}`;

export default function AdminLogsPanel({ enabled }: AdminLogsPanelProps) {
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [correlationFilter, setCorrelationFilter] = useState('');

  const requestedLevels = useMemo(
    () => (levelFilter === 'all' ? [] : [levelFilter]),
    [levelFilter],
  );

  const mergeLogs = (incomingLogs: AdminLogEntry[], mode: 'replace' | 'prepend' | 'append') => {
    setLogs((previousLogs) => {
      const combined =
        mode === 'replace'
          ? incomingLogs
          : mode === 'prepend'
            ? [...incomingLogs, ...previousLogs]
            : [...previousLogs, ...incomingLogs];

      const seen = new Set<string>();
      return combined.filter((entry) => {
        const key = getLogIdentity(entry);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    });
  };

  const loadLogs = async (mode: 'replace' | 'append' = 'replace') => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getAdminLogs({
        before: mode === 'append' ? nextBefore : null,
        levels: requestedLevels,
        service: serviceFilter.trim(),
        search: searchFilter.trim(),
        correlationId: correlationFilter.trim(),
        limit: 50,
      });

      mergeLogs(response.logs, mode === 'append' ? 'append' : 'replace');
      setHasMore(response.hasMore);
      setNextBefore(response.nextBefore);
    } catch (requestError) {
      setError('Failed to load admin logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs('replace');
  }, [enabled, levelFilter]);

  useEffect(() => {
    if (!enabled || !liveEnabled) {
      return;
    }

    const streamUrl = createAdminLogsStreamUrl(20);
    if (!streamUrl) {
      return;
    }

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as AdminLogEntry;
        if (requestedLevels.length > 0 && !requestedLevels.includes(entry.level as 'info' | 'warn' | 'error')) {
          return;
        }
        if (serviceFilter && entry.service !== serviceFilter.trim()) {
          return;
        }
        if (correlationFilter && entry.correlationId !== correlationFilter.trim()) {
          return;
        }
        if (
          searchFilter &&
          !`${entry.message} ${entry.event || ''}`.toLowerCase().includes(searchFilter.toLowerCase())
        ) {
          return;
        }

        mergeLogs([entry], 'prepend');
      } catch (_error) {
        setError('Received an invalid log event from the stream.');
      }
    };

    eventSource.onerror = () => {
      setError('Live log stream disconnected. You can refresh or resume live mode.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, liveEnabled, requestedLevels, serviceFilter, searchFilter, correlationFilter]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Operational Logs</CardTitle>
            <CardDescription>
              Live backend flow logs for admin debugging with recent history and filters.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLiveEnabled((current) => !current)}
              disabled={!enabled}
            >
              {liveEnabled ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {liveEnabled ? 'Pause Live' : 'Resume Live'}
            </Button>
            <Button variant="outline" onClick={() => void loadLogs('replace')} disabled={!enabled || isLoading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Select value={levelFilter} onValueChange={(value: LevelFilter) => setLevelFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Service"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          />
          <Input
            placeholder="Search message/event"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
          />
          <Input
            placeholder="Correlation ID"
            value={correlationFilter}
            onChange={(event) => setCorrelationFilter(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void loadLogs('replace')} disabled={!enabled || isLoading}>
            Apply Filters
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setLevelFilter('all');
              setServiceFilter('');
              setSearchFilter('');
              setCorrelationFilter('');
            }}
          >
            Clear
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!enabled ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Sign in as admin to access backend operational logs.
          </div>
        ) : (
          <>
            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <ScrollArea className="h-[520px] rounded-md border">
              <div className="space-y-3 p-4">
                {isLoading && logs.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading logs...
                  </div>
                ) : null}

                {!isLoading && logs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No logs matched the current filters.
                  </div>
                ) : null}

                {logs.map((entry) => (
                  <div key={getLogIdentity(entry)} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={levelBadgeVariantMap[entry.level] || 'secondary'}>
                        {entry.level.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary">{entry.service}</Badge>
                      {entry.event ? <Badge variant="outline">{entry.event}</Badge> : null}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm font-medium break-words">{entry.message}</p>

                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {entry.correlationId ? <div>Correlation: {entry.correlationId}</div> : null}
                      {entry.requestId ? <div>Request: {entry.requestId}</div> : null}
                    </div>

                    {entry.context && Object.keys(entry.context).length > 0 ? (
                      <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                        {JSON.stringify(entry.context, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 flex justify-between">
              <div className="text-xs text-muted-foreground">
                Showing newest logs first. Live mode uses a recent Redis-backed buffer plus new events.
              </div>
              <Button
                variant="outline"
                onClick={() => void loadLogs('append')}
                disabled={!hasMore || isLoading}
              >
                Load Older
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
