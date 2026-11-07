import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Loader2, Pause, Play, RefreshCcw, RotateCcw, Search, Wifi, WifiOff } from 'lucide-react';
import AdminLogEntryRow from './AdminLogEntryRow';
import './AdminLogsPanel.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { createAdminLogsStreamUrl, getAdminLogs, type AdminLogEntry } from '@/services/api';

type LevelFilter = 'all' | 'debug' | 'info' | 'warn' | 'error';
type StreamStatus = 'connecting' | 'live' | 'paused' | 'disconnected';

interface AdminLogsPanelProps {
	enabled: boolean;
	onLogin: () => void;
}

interface AppliedFilters {
	level: LevelFilter;
	service: string;
	search: string;
}

const streamConfig: Record<StreamStatus, { label: string; className: string; icon: typeof Wifi }> = {
	connecting: {
		label: 'Connecting',
		className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200',
		icon: Wifi,
	},
	live: {
		label: 'Live',
		className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200',
		icon: Wifi,
	},
	paused: {
		label: 'Paused',
		className: 'border-stone-200 bg-stone-100 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300',
		icon: Pause,
	},
	disconnected: {
		label: 'Disconnected',
		className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200',
		icon: WifiOff,
	},
};

const emptyFilters: AppliedFilters = {
	level: 'all',
	service: '',
	search: '',
};

const getLogIdentity = (entry: AdminLogEntry) =>
	entry.logId || entry.id || entry._id || `${entry.timestamp}-${entry.level}-${entry.message}`;

export default function AdminLogsPanel({ enabled, onLogin }: AdminLogsPanelProps) {
	const { toast } = useToast();
	const [logs, setLogs] = useState<AdminLogEntry[]>([]);
	const [knownServices, setKnownServices] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState('');
	const [hasMore, setHasMore] = useState(false);
	const [nextBefore, setNextBefore] = useState<string | null>(null);
	const [liveEnabled, setLiveEnabled] = useState(true);
	const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting');
	const [streamRevision, setStreamRevision] = useState(0);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
	const [searchDraft, setSearchDraft] = useState('');
	const [filters, setFilters] = useState<AppliedFilters>(emptyFilters);

	const requestedLevels = useMemo(
		() => (filters.level === 'all' ? [] : [filters.level]),
		[filters.level],
	);

	const mergeLogs = useCallback((
		incomingLogs: AdminLogEntry[],
		mode: 'replace' | 'prepend' | 'append',
	) => {
		setKnownServices((current) => Array.from(new Set([
			...current,
			...incomingLogs.map((entry) => entry.service).filter(Boolean),
		])).sort());

		setLogs((previousLogs) => {
			const combined = mode === 'replace'
				? incomingLogs
				: mode === 'prepend'
					? [...incomingLogs, ...previousLogs]
					: [...previousLogs, ...incomingLogs];
			const seen = new Set<string>();

			return combined.filter((entry) => {
				const key = getLogIdentity(entry);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		});
	}, []);

	const loadLogs = useCallback(async (
		mode: 'replace' | 'append' = 'replace',
		before: string | null = null,
	) => {
		if (!enabled) return;

		setIsLoading(true);
		setLoadError('');

		try {
			const response = await getAdminLogs({
				before: mode === 'append' ? before : null,
				levels: requestedLevels,
				service: filters.service,
				search: filters.search,
				limit: 50,
			});

			mergeLogs(response.logs, mode === 'append' ? 'append' : 'replace');
			setHasMore(response.hasMore);
			setNextBefore(response.nextBefore);
			setLastUpdatedAt(new Date());
		} catch (_requestError) {
			setLoadError('We could not load logs. Check the backend connection and try again.');
		} finally {
			setIsLoading(false);
		}
	}, [enabled, filters, mergeLogs, requestedLevels]);

	useEffect(() => {
		void loadLogs('replace');
	}, [loadLogs]);

	useEffect(() => {
		if (!enabled || !liveEnabled) {
			setStreamStatus('paused');
			return;
		}

		const streamUrl = createAdminLogsStreamUrl(30);
		if (!streamUrl) {
			setStreamStatus('disconnected');
			return;
		}

		setStreamStatus('connecting');
		const eventSource = new EventSource(streamUrl);
		eventSource.onopen = () => setStreamStatus('live');

		eventSource.onmessage = (event) => {
			try {
				const entry = JSON.parse(event.data) as AdminLogEntry;
				if (requestedLevels.length > 0 && !requestedLevels.includes(entry.level)) return;
				if (filters.service && entry.service !== filters.service) return;
				if (filters.search) {
					const haystack = `${entry.message} ${entry.event || ''} ${entry.service}`.toLowerCase();
					if (!haystack.includes(filters.search.toLowerCase())) return;
				}

				mergeLogs([entry], 'prepend');
				setLastUpdatedAt(new Date());
			} catch (_streamError) {
				setStreamStatus('disconnected');
			}
		};

		eventSource.onerror = () => {
			setStreamStatus('disconnected');
			eventSource.close();
		};

		return () => eventSource.close();
	}, [enabled, filters, liveEnabled, mergeLogs, requestedLevels, streamRevision]);

	const applySearch = (event: FormEvent) => {
		event.preventDefault();
		setFilters((current) => ({ ...current, search: searchDraft.trim() }));
	};

	const clearFilters = () => {
		setSearchDraft('');
		setFilters(emptyFilters);
	};

	const handleLiveToggle = () => {
		if (streamStatus === 'disconnected') {
			setLiveEnabled(true);
			setStreamRevision((current) => current + 1);
			return;
		}
		setLiveEnabled((current) => !current);
	};

	const handleCopy = async (label: string, value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			toast({ title: `${label} copied` });
		} catch (_error) {
			toast({ title: `Could not copy ${label.toLowerCase()}`, variant: 'destructive' });
		}
	};

	const activeFilterCount = [
		filters.level !== 'all',
		Boolean(filters.service),
		Boolean(filters.search),
	].filter(Boolean).length;
	const stream = streamConfig[streamStatus];
	const StreamIcon = stream.icon;
	const severityFilters: { level: LevelFilter; label: string; count?: number }[] = [
		{ level: 'all', label: 'All', count: logs.length },
		{ level: 'error', label: 'Errors', count: logs.filter((entry) => entry.level === 'error').length },
		{ level: 'warn', label: 'Warn', count: logs.filter((entry) => entry.level === 'warn').length },
		{ level: 'info', label: 'Info' },
		{ level: 'debug', label: 'Debug' },
	];

	if (!enabled) {
		return (
			<Card className="border-stone-200/90 bg-white shadow-sm dark:border-white/10 dark:bg-[#111113]">
				<CardContent className="flex min-h-[360px] items-center justify-center p-6">
					<div className="max-w-md text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/5">
							<Activity className="h-6 w-6 text-stone-600 dark:text-stone-300" />
						</div>
						<h2 className="mt-4 text-xl font-semibold">Sign in to view system activity</h2>
						<p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
							Operational logs can include internal request details, so this workspace is available to administrators only.
						</p>
						<Button onClick={onLogin} className="mt-5">Admin Login</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="admin-logs overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm !animate-none !transform-none !transition-none dark:border-white/10 dark:bg-[#111113]">
			<div className="space-y-3 border-b border-stone-200/80 p-3 dark:border-white/10 sm:p-4">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<h2 className="text-sm font-semibold sm:text-base">Activity</h2>
						<Badge variant="outline" className={cn('gap-1 px-1.5 text-[11px]', stream.className)}>
							<StreamIcon aria-hidden="true" className="h-3 w-3" />{stream.label}
						</Badge>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<Button variant="ghost" size="sm" className="h-9 px-2" onClick={handleLiveToggle} aria-label={streamStatus === 'disconnected' ? 'Reconnect live updates' : liveEnabled ? 'Pause live updates' : 'Resume live updates'}>
							{liveEnabled && streamStatus !== 'disconnected' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
							<span className="hidden sm:inline">{streamStatus === 'disconnected' ? 'Reconnect' : liveEnabled ? 'Pause' : 'Resume'}</span>
						</Button>
						<Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => void loadLogs('replace')} disabled={isLoading} aria-label="Refresh logs">
							<RefreshCcw aria-hidden="true" className={cn(isLoading && 'animate-spin')} /><span className="hidden sm:inline">Refresh</span>
						</Button>
					</div>
				</div>

				<div className="flex gap-2">
					<form onSubmit={applySearch} className="relative flex min-w-0 flex-1">
						<Input
							value={searchDraft}
							onChange={(event) => setSearchDraft(event.target.value)}
							aria-label="Search logs"
							placeholder="Search logs…"
							className="h-9 pr-10 text-base sm:text-sm"
						/>
						<Button type="submit" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9" aria-label="Apply log search">
							<Search aria-hidden="true" />
						</Button>
					</form>
					<Select value={filters.service || 'all'} onValueChange={(value) => setFilters((current) => ({ ...current, service: value === 'all' ? '' : value }))}>
						<SelectTrigger aria-label="Filter by service" className="h-9 w-[125px] shrink-0 text-xs sm:w-[200px] sm:text-sm">
							<SelectValue placeholder="All services" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All services</SelectItem>
							{knownServices.map((service) => <SelectItem key={service} value={service}>{service}</SelectItem>)}
						</SelectContent>
					</Select>
				</div>

				<div className="grid grid-cols-5 gap-1 sm:flex sm:gap-2" role="group" aria-label="Filter by severity">
					{severityFilters.map(({ level, label, count }) => (
						<Button key={level} type="button" variant={filters.level === level ? 'default' : 'ghost'} size="sm"
							aria-pressed={filters.level === level}
							onClick={() => setFilters((current) => ({ ...current, level }))}
							className="h-9 min-w-0 gap-1 px-1 text-xs sm:px-3"
						>
							{label}{count !== undefined ? <span className="text-[10px] tabular-nums opacity-70">{count}</span> : null}
						</Button>
					))}
				</div>
				{activeFilterCount > 0 ? (
					<div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
						<p className="min-w-0 truncate">{filters.search ? `Results for “${filters.search}”` : `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}</p>
						<Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={clearFilters}>
							<RotateCcw aria-hidden="true" className="h-3 w-3" /> Clear filters
						</Button>
					</div>
				) : null}
			</div>

			{loadError ? (
				<div role="alert" className="m-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
					<p className="flex items-center gap-2"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />{loadError}</p>
					<Button variant="outline" size="sm" onClick={() => void loadLogs('replace')}>Try again</Button>
				</div>
			) : null}
			{streamStatus === 'disconnected' ? (
				<div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
					<p>Live updates stopped. Showing saved logs.</p>
					<Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={handleLiveToggle}>Reconnect</Button>
				</div>
			) : null}

			<CardContent className="p-0">
				{isLoading && logs.length === 0 ? (
					<div className="flex min-h-48 items-center justify-center text-sm text-stone-500">
						<Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> Loading logs…
					</div>
				) : logs.length === 0 ? (
					<div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
						<Search aria-hidden="true" className="h-6 w-6 text-stone-400" />
						<h3 className="mt-3 text-base font-semibold">{loadError ? 'Logs unavailable' : 'No matching activity'}</h3>
						<p className="mt-1 text-sm text-stone-500">{loadError ? 'Try loading the logs again.' : 'Try another search or clear your filters.'}</p>
						{activeFilterCount > 0 ? <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>Clear filters</Button> : null}
					</div>
				) : (
					<ol role="list" aria-label="Operational log events">
						{logs.map((entry) => <AdminLogEntryRow key={getLogIdentity(entry)} entry={entry} onCopy={handleCopy} />)}
					</ol>
				)}
				<div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/80 bg-stone-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.025] sm:px-4">
					<p className="text-xs text-stone-500 dark:text-stone-400">
						{logs.length} loaded · Newest first
						{lastUpdatedAt ? <span className="hidden sm:inline"> · Updated {lastUpdatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span> : null}
					</p>
					<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => void loadLogs('append', nextBefore)} disabled={!hasMore || isLoading}>
						{isLoading ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : null}
						{hasMore ? 'Load older logs' : 'All caught up'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
