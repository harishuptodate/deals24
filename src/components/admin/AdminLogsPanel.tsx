import { adminLogButtonClassName } from '@/components/admin/adminLogStyles';
import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Activity, AlertCircle, Loader2, Pause, Play, RefreshCcw, RotateCcw, Search, Wifi, WifiOff } from 'lucide-react';
import AdminLogEntryRow from './AdminLogEntryRow';
import { getLogIdentity, groupAdminLogs } from './adminLogGroups';
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

const streamConfig: Record<StreamStatus, { label: string; icon: typeof Wifi }> = {
	connecting: {
		label: 'Connecting',
		icon: Wifi,
	},
	live: {
		label: 'Live',
		icon: Wifi,
	},
	paused: {
		label: 'Paused',
		icon: Pause,
	},
	disconnected: {
		label: 'Disconnected',
		icon: WifiOff,
	},
};

const emptyFilters: AppliedFilters = {
	level: 'all',
	service: '',
	search: '',
};

export default function AdminLogsPanel({ enabled, onLogin }: AdminLogsPanelProps) {
	const { toast } = useToast();
	const filterId = useId();
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

	const logGroups = useMemo(() => groupAdminLogs(logs), [logs]);

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
			<Card className="admin-logs [container-type:inline-size] overflow-hidden rounded-[0.875rem] border border-t-[3px] border-[var(--log-border)] border-t-[var(--log-primary-fill)] bg-[var(--log-surface)] text-[var(--log-ink)] shadow-[0_2px_8px_rgb(15_23_42/0.04)] !transform-none !animate-none !transition-none">
				<CardContent className="flex min-h-[360px] items-center justify-center p-6">
					<div className="max-w-md text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 dark:bg-white/5">
							<Activity className="h-6 w-6 text-stone-600 dark:text-stone-300" />
						</div>
						<h2 className="mt-4 text-xl font-semibold">Sign in to view system activity</h2>
						<p className="logs-muted text-[var(--log-muted)] mt-2 text-sm leading-6">
							Operational logs can include internal request details, so this workspace is available to administrators only.
						</p>
						<Button onClick={onLogin} className={cn(adminLogButtonClassName, "logs-button mt-5")}>Admin Login</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="admin-logs [container-type:inline-size] overflow-hidden rounded-[0.875rem] border border-t-[3px] border-[var(--log-border)] border-t-[var(--log-primary-fill)] bg-[var(--log-surface)] text-[var(--log-ink)] shadow-[0_2px_8px_rgb(15_23_42/0.04)] !transform-none !animate-none !transition-none">
			<div className="logs-toolbar grid gap-3 border-b border-[var(--log-border)] p-3 [@container(min-width:43.75rem)]:p-4">
				<div className="logs-toolbar-heading flex flex-wrap items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<h2 className="text-sm font-semibold sm:text-base">Event stream</h2>
						<Badge variant="outline" role="status" aria-atomic="true" data-status={streamStatus} className="logs-stream inline-flex items-center gap-1.5 border-0 bg-[var(--log-raised)] px-2 py-0.5 text-xs font-medium text-[var(--log-muted)] data-[status=live]:bg-[var(--log-live-bg)] data-[status=live]:text-[var(--log-live)] data-[status=connecting]:bg-[var(--log-info-bg)] data-[status=connecting]:text-[var(--log-info)] data-[status=disconnected]:bg-[var(--log-error-bg)] data-[status=disconnected]:text-[var(--log-error)]">
							<StreamIcon aria-hidden="true" className="h-3 w-3" />{stream.label}
						</Badge>
					</div>
					<div className="logs-toolbar-actions flex items-center gap-2 shrink-0">
						<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button")} onClick={handleLiveToggle} aria-label={streamStatus === 'disconnected' ? 'Reconnect live updates' : liveEnabled ? 'Pause live updates' : 'Resume live updates'}>
							{liveEnabled && streamStatus !== 'disconnected' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
							<span className="logs-action-label hidden [@container(min-width:37.5rem)]:inline">{streamStatus === 'disconnected' ? 'Reconnect' : liveEnabled ? 'Pause' : 'Resume'}</span>
						</Button>
						<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button")} onClick={() => void loadLogs('replace')} disabled={isLoading} aria-label="Refresh logs">
							<RefreshCcw aria-hidden="true" className={cn(isLoading && 'animate-spin')} /><span className="logs-action-label hidden [@container(min-width:37.5rem)]:inline">Refresh</span>
						</Button>
					</div>
				</div>

				<div className="logs-filter-controls grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] gap-2 [@container(min-width:37.5rem)]:grid-cols-[minmax(0,1fr)_12rem] [@container(max-width:18rem)]:grid-cols-[minmax(0,1fr)]">
					<form onSubmit={applySearch} className="logs-field grid min-w-0 gap-1.5 [&_label]:text-xs [&_label]:font-semibold [&_label]:text-[var(--log-muted)]">
						<label htmlFor={`${filterId}-search`}>Search logs</label>
						<div className="relative min-w-0">
							<Input
								id={`${filterId}-search`}
								value={searchDraft}
								onChange={(event) => setSearchDraft(event.target.value)}
								aria-label="Search logs"
								placeholder="Find text…"
								className="logs-control min-h-11 h-auto min-w-0 rounded-lg border-[var(--log-control-border)] bg-[var(--log-surface)] text-[var(--log-ink)] placeholder:text-[var(--log-muted)] pr-12 text-base sm:text-sm"
							/>
							<Button type="submit" variant="ghost" size="icon" className="logs-search-submit absolute right-0 top-0 min-h-11 min-w-11 text-[var(--log-primary)]" aria-label="Apply log search">
								<Search aria-hidden="true" />
							</Button>
						</div>
					</form>
					<div className="logs-field grid min-w-0 gap-1.5 [&_label]:text-xs [&_label]:font-semibold [&_label]:text-[var(--log-muted)]">
						<label htmlFor={`${filterId}-service`}>Service</label>
						<Select value={filters.service || 'all'} onValueChange={(value) => setFilters((current) => ({ ...current, service: value === 'all' ? '' : value }))}>
							<SelectTrigger id={`${filterId}-service`} aria-label="Filter by service" className="logs-control min-h-11 h-auto min-w-0 rounded-lg border-[var(--log-control-border)] bg-[var(--log-surface)] text-[var(--log-ink)] placeholder:text-[var(--log-muted)] text-xs sm:text-sm">
								<SelectValue placeholder="All services" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All services</SelectItem>
								{knownServices.map((service) => <SelectItem key={service} value={service}>{service}</SelectItem>)}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="logs-severity grid grid-cols-[repeat(auto-fit,minmax(min(100%,2.875rem),1fr))] gap-2 [@container(min-width:37.5rem)]:flex" role="group" aria-label="Filter by severity">
					{severityFilters.map(({ level, label, count }) => (
						<Button key={level} type="button" variant={filters.level === level ? 'default' : 'ghost'} size="sm"
							aria-pressed={filters.level === level}
							onClick={() => setFilters((current) => ({ ...current, level }))}
							className="logs-severity-button min-w-0 min-h-11 h-auto gap-1.5 rounded-lg bg-[var(--log-raised)] px-1 py-1.5 text-xs text-[var(--log-muted)] hover:bg-[var(--log-primary-soft)] hover:text-[var(--log-primary)] aria-pressed:bg-[var(--log-primary-fill)] aria-pressed:text-white [@container(min-width:37.5rem)]:px-4 [@container(min-width:43.75rem)]:min-h-9 [@media(pointer:coarse)]:min-h-11"
						>
							{label}{count !== undefined ? <span className="logs-severity-count hidden tabular-nums [@container(min-width:22.5rem)]:inline">{count}</span> : null}
						</Button>
					))}
				</div>
				{activeFilterCount > 0 ? (
					<div className="logs-muted text-[var(--log-muted)] flex items-center justify-between gap-2 text-xs">
						<p className="min-w-0 truncate">{filters.search ? `Results for “${filters.search}”` : `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}</p>
						<Button type="button" variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button shrink-0")} onClick={clearFilters}>
							<RotateCcw aria-hidden="true" className="h-3 w-3" /> Clear filters
						</Button>
					</div>
				) : null}
			</div>

			{loadError ? (
				<div role="alert" className="m-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
					<p className="flex items-center gap-2"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />{loadError}</p>
					<Button variant="outline" size="sm" className={cn(adminLogButtonClassName, "logs-button")} onClick={() => void loadLogs('replace')}>Try again</Button>
				</div>
			) : null}
			{streamStatus === 'disconnected' ? (
				<div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
					<p>Live updates stopped. Showing saved logs.</p>
					<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button shrink-0")} onClick={handleLiveToggle}>Reconnect</Button>
				</div>
			) : null}

			<CardContent className="p-0">
				<div className="logs-columns hidden [@container(min-width:43.75rem)]:grid [@container(min-width:43.75rem)]:grid-cols-[0.875rem_3.75rem_4.5rem_6.5rem_minmax(0,1fr)_5.5rem] [@container(min-width:43.75rem)]:items-center [@container(min-width:43.75rem)]:gap-x-2 [@container(min-width:43.75rem)]:border-b [@container(min-width:43.75rem)]:border-[var(--log-border)] [@container(min-width:43.75rem)]:bg-[var(--log-raised)] [@container(min-width:43.75rem)]:px-3 [@container(min-width:43.75rem)]:py-2 [@container(min-width:43.75rem)]:text-xs [@container(min-width:43.75rem)]:font-semibold [@container(min-width:43.75rem)]:text-[var(--log-muted)]" aria-hidden="true">
					<span /><span>Level</span><span>Time</span><span>Service</span><span>Message</span><span className="text-right">Telegram</span>
				</div>
				{isLoading && logs.length === 0 ? (
					<div className="logs-muted text-[var(--log-muted)] flex min-h-48 items-center justify-center text-sm">
						<Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> Loading logs…
					</div>
				) : logs.length === 0 ? (
					<div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
						<Search aria-hidden="true" className="logs-muted text-[var(--log-muted)] h-6 w-6" />
						<h3 className="mt-3 text-base font-semibold">{loadError ? 'Logs unavailable' : 'No matching activity'}</h3>
						<p className="logs-muted text-[var(--log-muted)] mt-1 text-sm">{loadError ? 'Try loading the logs again.' : 'Try another search or clear your filters.'}</p>
						{activeFilterCount > 0 ? <Button variant="outline" size="sm" className={cn(adminLogButtonClassName, "logs-button mt-3")} onClick={clearFilters}>Clear filters</Button> : null}
					</div>
				) : (
					<ol role="list" aria-label="Operational log events">
						{logGroups.map((group) => <AdminLogEntryRow key={group.key} entry={group.entry} entries={group.telegramId ? group.entries : undefined} status={group.status} summary={group.summary} telegramId={group.telegramId} onCopy={handleCopy} />)}
					</ol>
				)}
				<div className="logs-footer flex flex-wrap items-center justify-between gap-3 border-t border-[var(--log-border)] bg-[var(--log-raised)] p-3">
					<p className="logs-muted text-[var(--log-muted)] text-xs">
						{logs.length} events in {logGroups.length} rows · Newest first
						{lastUpdatedAt ? <span className="hidden sm:inline"> · Updated {lastUpdatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span> : null}
						<span className="mt-1 block">Grouped by Telegram message. History includes loaded events{activeFilterCount ? " matching your filters" : ""}.</span>
					</p>
					<Button variant="outline" size="sm" className={cn(adminLogButtonClassName, "logs-button")} onClick={() => void loadLogs('append', nextBefore)} disabled={!hasMore || isLoading}>
						{isLoading ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : null}
						{hasMore ? 'Load older logs' : 'All caught up'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
