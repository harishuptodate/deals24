import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Bug,
	CheckCircle2,
	ChevronDown,
	CircleX,
	Clock3,
	Copy,
	Info,
	ListFilter,
	Loader2,
	Pause,
	Play,
	RefreshCcw,
	RotateCcw,
	Search,
	Server,
	Wifi,
	WifiOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
	correlationId: string;
}

const levelConfig = {
	debug: {
		label: 'Debug',
		icon: Bug,
		badgeClass: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-200',
		iconClass: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
	},
	info: {
		label: 'Info',
		icon: Info,
		badgeClass: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200',
		iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
	},
	warn: {
		label: 'Warning',
		icon: AlertTriangle,
		badgeClass: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200',
		iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
	},
	error: {
		label: 'Error',
		icon: CircleX,
		badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200',
		iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
	},
};

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
	correlationId: '',
};

const getLogIdentity = (entry: AdminLogEntry) =>
	entry.logId || entry.id || entry._id || `${entry.timestamp}-${entry.level}-${entry.message}`;

const formatTimestamp = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString('en-IN', {
		hour12: true,
		day: '2-digit',
		month: 'short',
		year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
};

const countByLevel = (logs: AdminLogEntry[], level: AdminLogEntry['level']) =>
	logs.filter((entry) => entry.level === level).length;

function LogEntryRow({
	entry,
	onFilterByTrace,
	onCopy,
}: {
	entry: AdminLogEntry;
	onFilterByTrace: (correlationId: string) => void;
	onCopy: (label: string, value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const config = levelConfig[entry.level] || levelConfig.info;
	const LevelIcon = config.icon;
	const hasDetails = Boolean(
		entry.event
		|| entry.requestId
		|| entry.correlationId
		|| (entry.context && Object.keys(entry.context).length > 0),
	);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<article className="border-b border-stone-200/80 bg-white transition-colors last:border-b-0 hover:bg-stone-50/80 dark:border-white/10 dark:bg-[#111113] dark:hover:bg-white/[0.025]">
				<div className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[32px_110px_minmax(110px,150px)_1fr_auto] lg:items-start">
					<div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.iconClass)}>
						<LevelIcon className="h-4 w-4" />
					</div>

					<div className="min-w-0 lg:pt-1">
						<Badge variant="outline" className={cn('font-medium', config.badgeClass)}>
							{config.label}
						</Badge>
						<p className="mt-1.5 whitespace-nowrap text-xs text-stone-500 dark:text-stone-400 lg:hidden">
							{formatTimestamp(entry.timestamp)}
						</p>
					</div>

					<div className="min-w-0 lg:pt-1">
						<p className="truncate text-sm font-medium text-stone-800 dark:text-stone-200">
							{entry.service || 'Unknown service'}
						</p>
						{entry.event ? (
							<p className="mt-1 truncate font-mono text-[11px] text-stone-500 dark:text-stone-400">
								{entry.event}
							</p>
						) : null}
					</div>

					<div className="min-w-0 lg:pt-1">
						<p className="text-sm leading-6 text-stone-800 dark:text-stone-200">
							{entry.message}
						</p>
					</div>

					<div className="flex items-start justify-between gap-2 lg:justify-end">
						<time className="hidden whitespace-nowrap pt-1 text-xs text-stone-500 dark:text-stone-400 lg:block">
							{formatTimestamp(entry.timestamp)}
						</time>
						{hasDetails ? (
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Show log details">
									<ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
								</Button>
							</CollapsibleTrigger>
						) : null}
					</div>
				</div>

				{hasDetails ? (
					<CollapsibleContent>
						<div className="border-t border-stone-200/80 bg-stone-50/70 px-4 py-4 dark:border-white/10 dark:bg-black/15 sm:px-5 lg:pl-[182px]">
							<div className="grid gap-3 md:grid-cols-2">
								{entry.correlationId ? (
									<div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.035]">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">Trace ID</p>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => onFilterByTrace(entry.correlationId as string)}
												className="min-w-0 truncate font-mono text-xs text-sky-700 hover:underline dark:text-sky-300"
											>
												{entry.correlationId}
											</button>
											<Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => onCopy('Trace ID', entry.correlationId as string)}>
												<Copy className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								) : null}

								{entry.requestId ? (
									<div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.035]">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone-500">Request ID</p>
										<div className="flex items-center gap-2">
											<p className="min-w-0 truncate font-mono text-xs">{entry.requestId}</p>
											<Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => onCopy('Request ID', entry.requestId as string)}>
												<Copy className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								) : null}
							</div>

							{entry.context && Object.keys(entry.context).length > 0 ? (
								<div className="mt-3 overflow-hidden rounded-xl border border-stone-800 bg-[#111113]">
									<div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
										<p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Event context</p>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-stone-300 hover:bg-white/10 hover:text-white"
											onClick={() => onCopy('Event context', JSON.stringify(entry.context, null, 2))}
										>
											<Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
										</Button>
									</div>
									<pre className="max-h-80 overflow-auto p-4 text-xs leading-6 text-stone-200">
										{JSON.stringify(entry.context, null, 2)}
									</pre>
								</div>
							) : null}
						</div>
					</CollapsibleContent>
				) : null}
			</article>
		</Collapsible>
	);
}

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
	const [showTraceFilter, setShowTraceFilter] = useState(false);
	const [searchDraft, setSearchDraft] = useState('');
	const [correlationDraft, setCorrelationDraft] = useState('');
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
				correlationId: filters.correlationId,
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
				if (filters.correlationId && entry.correlationId !== filters.correlationId) return;
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

	const applyTraceFilter = () => {
		setFilters((current) => ({ ...current, correlationId: correlationDraft.trim() }));
	};

	const filterByTrace = (correlationId: string) => {
		setCorrelationDraft(correlationId);
		setShowTraceFilter(true);
		setFilters((current) => ({ ...current, correlationId }));
	};

	const clearFilters = () => {
		setSearchDraft('');
		setCorrelationDraft('');
		setFilters(emptyFilters);
		setShowTraceFilter(false);
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
		Boolean(filters.correlationId),
	].filter(Boolean).length;
	const stream = streamConfig[streamStatus];
	const StreamIcon = stream.icon;
	const errorCount = countByLevel(logs, 'error');
	const warningCount = countByLevel(logs, 'warn');
	const infoCount = countByLevel(logs, 'info');
	const isHealthy = errorCount === 0;

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
		<div className="space-y-5">
			<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Log summary">
				<button
					type="button"
					onClick={() => setFilters((current) => ({ ...current, level: 'all' }))}
					className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-stone-300 dark:border-white/10 dark:bg-[#111113] dark:hover:border-white/20"
				>
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium text-stone-600 dark:text-stone-400">System status</span>
						{isHealthy
							? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
							: <AlertCircle className="h-5 w-5 text-rose-500" />}
					</div>
					<p className={cn('mt-3 text-2xl font-semibold', isHealthy ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>
						{isHealthy ? 'No errors' : `${errorCount} error${errorCount === 1 ? '' : 's'}`}
					</p>
					<p className="mt-1 text-xs text-stone-500">In the currently loaded results</p>
				</button>

				<button
					type="button"
					onClick={() => setFilters((current) => ({ ...current, level: 'error' }))}
					className={cn(
						'rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors dark:bg-[#111113]',
						filters.level === 'error' ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-500/15' : 'border-stone-200 hover:border-rose-300 dark:border-white/10',
					)}
				>
					<div className="flex items-center justify-between text-sm font-medium text-stone-600 dark:text-stone-400">
						Errors <CircleX className="h-5 w-5 text-rose-500" />
					</div>
					<p className="mt-3 text-2xl font-semibold">{errorCount}</p>
					<p className="mt-1 text-xs text-stone-500">Click to investigate</p>
				</button>

				<button
					type="button"
					onClick={() => setFilters((current) => ({ ...current, level: 'warn' }))}
					className={cn(
						'rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors dark:bg-[#111113]',
						filters.level === 'warn' ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-500/15' : 'border-stone-200 hover:border-amber-300 dark:border-white/10',
					)}
				>
					<div className="flex items-center justify-between text-sm font-medium text-stone-600 dark:text-stone-400">
						Warnings <AlertTriangle className="h-5 w-5 text-amber-500" />
					</div>
					<p className="mt-3 text-2xl font-semibold">{warningCount}</p>
					<p className="mt-1 text-xs text-stone-500">Potential issues</p>
				</button>

				<div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111113]">
					<div className="flex items-center justify-between text-sm font-medium text-stone-600 dark:text-stone-400">
						Activity <Server className="h-5 w-5 text-sky-500" />
					</div>
					<p className="mt-3 text-2xl font-semibold">{logs.length}</p>
					<p className="mt-1 text-xs text-stone-500">{infoCount} informational events</p>
				</div>
			</section>

			<Card className="overflow-hidden border-stone-200/90 bg-white shadow-sm !transform-none !transition-none dark:border-white/10 dark:bg-[#111113]">
				<div className="border-b border-stone-200/80 p-4 dark:border-white/10 sm:p-5">
					<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-lg font-semibold">Event timeline</h2>
								<Badge variant="outline" className={stream.className}>
									<StreamIcon className={cn('mr-1.5 h-3.5 w-3.5', streamStatus === 'connecting' && 'animate-pulse')} />
									{stream.label}
								</Badge>
								{activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount} filtered</Badge> : null}
							</div>
							<p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
								Newest events appear first{lastUpdatedAt ? ` · Updated ${lastUpdatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button variant="outline" size="sm" onClick={handleLiveToggle}>
								{streamStatus === 'live' || streamStatus === 'connecting'
									? <Pause className="mr-2 h-4 w-4" />
									: <Play className="mr-2 h-4 w-4" />}
								{streamStatus === 'disconnected' ? 'Reconnect' : liveEnabled ? 'Pause live' : 'Resume live'}
							</Button>
							<Button variant="outline" size="sm" onClick={() => void loadLogs('replace')} disabled={isLoading}>
								<RefreshCcw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
								Refresh
							</Button>
						</div>
					</div>

					<div className="mt-5 space-y-3">
						<div className="flex flex-col gap-3 lg:flex-row">
							<form onSubmit={applySearch} className="flex min-w-0 flex-1 gap-2">
								<div className="relative min-w-0 flex-1">
									<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
									<Input
										value={searchDraft}
										onChange={(event) => setSearchDraft(event.target.value)}
										placeholder="Search messages, events, or services"
										className="pl-9"
									/>
								</div>
								<Button type="submit" variant="secondary">Search</Button>
							</form>

							<Select
								value={filters.service || 'all'}
								onValueChange={(value) => setFilters((current) => ({ ...current, service: value === 'all' ? '' : value }))}
							>
								<SelectTrigger className="w-full lg:w-[210px]">
									<SelectValue placeholder="All services" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All services</SelectItem>
									{knownServices.map((service) => <SelectItem key={service} value={service}>{service}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
								<ListFilter className="h-3.5 w-3.5" /> Severity
							</span>
							{(['all', 'error', 'warn', 'info', 'debug'] as LevelFilter[]).map((level) => (
								<Button
									key={level}
									type="button"
									variant={filters.level === level ? 'default' : 'outline'}
									size="sm"
									onClick={() => setFilters((current) => ({ ...current, level }))}
									className="h-8 capitalize"
								>
									{level === 'all' ? 'All' : levelConfig[level].label}
								</Button>
							))}
							<Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setShowTraceFilter((current) => !current)}>
								{showTraceFilter ? 'Hide trace filter' : 'Filter by trace ID'}
							</Button>
							{activeFilterCount > 0 ? (
								<Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
									<RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Clear all
								</Button>
							) : null}
						</div>

						{showTraceFilter ? (
							<div className="flex max-w-xl gap-2 rounded-xl bg-stone-50 p-3 dark:bg-white/[0.035]">
								<Input
									value={correlationDraft}
									onChange={(event) => setCorrelationDraft(event.target.value)}
									onKeyDown={(event) => event.key === 'Enter' && applyTraceFilter()}
									placeholder="Paste a trace/correlation ID"
									className="font-mono text-xs"
								/>
								<Button type="button" variant="secondary" onClick={applyTraceFilter}>Apply</Button>
							</div>
						) : null}
					</div>
				</div>

				{loadError ? (
					<div className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200 sm:m-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {loadError}</div>
						<Button variant="outline" size="sm" onClick={() => void loadLogs('replace')}>Try again</Button>
					</div>
				) : null}

				{streamStatus === 'disconnected' ? (
					<div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 sm:mx-5">
						<span>Live updates stopped. Existing logs are still available.</span>
						<Button variant="ghost" size="sm" onClick={handleLiveToggle}>Reconnect</Button>
					</div>
				) : null}

				<CardContent className="p-0">
					{isLoading && logs.length === 0 ? (
						<div className="flex min-h-[360px] items-center justify-center text-sm text-stone-500">
							<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading activity…
						</div>
					) : logs.length === 0 ? (
						<div className="flex min-h-[360px] items-center justify-center p-8 text-center">
							<div className="max-w-sm">
								<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 dark:bg-white/5">
									<Search className="h-5 w-5 text-stone-500" />
								</div>
								<h3 className="mt-4 font-semibold">No matching activity</h3>
								<p className="mt-1.5 text-sm leading-6 text-stone-500">
									Try a broader search, another severity, or clear the active filters.
								</p>
								{activeFilterCount > 0 ? <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button> : null}
							</div>
						</div>
					) : (
						<ScrollArea className="h-[min(68vh,760px)] min-h-[420px]">
							<div role="feed" aria-label="Operational log events">
								{logs.map((entry) => (
									<LogEntryRow
										key={getLogIdentity(entry)}
										entry={entry}
										onFilterByTrace={filterByTrace}
										onCopy={handleCopy}
									/>
								))}
							</div>
						</ScrollArea>
					)}

					<div className="flex flex-col gap-3 border-t border-stone-200/80 bg-stone-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between sm:px-5">
						<div className="flex items-center gap-2 text-xs text-stone-500">
							<Clock3 className="h-3.5 w-3.5" /> Showing {logs.length} events
						</div>
						<Button variant="outline" size="sm" onClick={() => void loadLogs('append', nextBefore)} disabled={!hasMore || isLoading}>
							{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
							{hasMore ? 'Load older events' : 'No older events'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
