import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Pause, Play, RefreshCcw, Search, Waves } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { createAdminLogsStreamUrl, getAdminLogs, type AdminLogEntry } from '@/services/api';

type LevelFilter = 'all' | 'info' | 'warn' | 'error';

interface AdminLogsPanelProps {
	enabled: boolean;
}

interface AppliedFilters {
	level: LevelFilter;
	service: string;
	search: string;
	correlationId: string;
}

const levelThemes: Record<
	string,
	{
		badge: 'default' | 'secondary' | 'destructive' | 'outline';
		accent: string;
		ring: string;
	}
> = {
	info: {
		badge: 'secondary',
		accent:
			'from-sky-500/15 via-sky-400/5 to-transparent dark:from-sky-500/20 dark:via-sky-500/8',
		ring: 'border-sky-200/80 dark:border-sky-500/20',
	},
	warn: {
		badge: 'outline',
		accent:
			'from-amber-500/18 via-amber-400/5 to-transparent dark:from-amber-500/18 dark:via-amber-500/8',
		ring: 'border-amber-200/90 dark:border-amber-500/20',
	},
	error: {
		badge: 'destructive',
		accent:
			'from-rose-500/18 via-rose-400/5 to-transparent dark:from-rose-500/20 dark:via-rose-500/8',
		ring: 'border-rose-200/90 dark:border-rose-500/25',
	},
	debug: {
		badge: 'default',
		accent:
			'from-violet-500/14 via-violet-400/5 to-transparent dark:from-violet-500/18 dark:via-violet-500/8',
		ring: 'border-violet-200/80 dark:border-violet-500/18',
	},
};

const getLogIdentity = (entry: AdminLogEntry) =>
	entry.logId || entry.id || entry._id || `${entry.timestamp}-${entry.level}-${entry.message}`;

const formatTimestamp = (value: string) => {
	try {
		return new Date(value).toLocaleString('en-IN', {
			hour12: true,
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	} catch (_error) {
		return value;
	}
};

const countByLevel = (logs: AdminLogEntry[], level: LevelFilter) => {
	if (level === 'all') {
		return logs.length;
	}
	return logs.filter((entry) => entry.level === level).length;
};

export default function AdminLogsPanel({ enabled }: AdminLogsPanelProps) {
	const [logs, setLogs] = useState<AdminLogEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [hasMore, setHasMore] = useState(false);
	const [nextBefore, setNextBefore] = useState<string | null>(null);
	const [liveEnabled, setLiveEnabled] = useState(true);

	const [levelDraft, setLevelDraft] = useState<LevelFilter>('all');
	const [serviceDraft, setServiceDraft] = useState('');
	const [searchDraft, setSearchDraft] = useState('');
	const [correlationDraft, setCorrelationDraft] = useState('');
	const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
		level: 'all',
		service: '',
		search: '',
		correlationId: '',
	});

	const requestedLevels = useMemo(
		() => (appliedFilters.level === 'all' ? [] : [appliedFilters.level]),
		[appliedFilters.level],
	);

	const mergeLogs = (
		incomingLogs: AdminLogEntry[],
		mode: 'replace' | 'prepend' | 'append',
	) => {
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
				service: appliedFilters.service.trim(),
				search: appliedFilters.search.trim(),
				correlationId: appliedFilters.correlationId.trim(),
				limit: 50,
			});

			mergeLogs(response.logs, mode === 'append' ? 'append' : 'replace');
			setHasMore(response.hasMore);
			setNextBefore(response.nextBefore);
		} catch (_requestError) {
			setError('Failed to load admin logs.');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadLogs('replace');
	}, [enabled, appliedFilters]);

	useEffect(() => {
		if (!enabled || !liveEnabled) {
			return;
		}

		const streamUrl = createAdminLogsStreamUrl(30);
		if (!streamUrl) {
			return;
		}

		setError('');
		const eventSource = new EventSource(streamUrl);

		eventSource.onmessage = (event) => {
			try {
				const entry = JSON.parse(event.data) as AdminLogEntry;
				if (requestedLevels.length > 0 && !requestedLevels.includes(entry.level as 'info' | 'warn' | 'error')) {
					return;
				}
				if (
					appliedFilters.service &&
					entry.service !== appliedFilters.service.trim()
				) {
					return;
				}
				if (
					appliedFilters.correlationId &&
					entry.correlationId !== appliedFilters.correlationId.trim()
				) {
					return;
				}
				if (appliedFilters.search) {
					const searchHaystack = `${entry.message} ${entry.event || ''} ${entry.service}`.toLowerCase();
					if (!searchHaystack.includes(appliedFilters.search.toLowerCase())) {
						return;
					}
				}

				mergeLogs([entry], 'prepend');
			} catch (_streamError) {
				setError('Received an invalid log event from the stream.');
			}
		};

		eventSource.onerror = () => {
			setError('Live log stream disconnected. Resume live mode to reconnect.');
			eventSource.close();
		};

		return () => {
			eventSource.close();
		};
	}, [enabled, liveEnabled, requestedLevels, appliedFilters]);

	const handleApplyFilters = () => {
		setAppliedFilters({
			level: levelDraft,
			service: serviceDraft.trim(),
			search: searchDraft.trim(),
			correlationId: correlationDraft.trim(),
		});
	};

	const handleClearFilters = () => {
		setLevelDraft('all');
		setServiceDraft('');
		setSearchDraft('');
		setCorrelationDraft('');
		setAppliedFilters({
			level: 'all',
			service: '',
			search: '',
			correlationId: '',
		});
	};

	const activeFilterCount = [
		appliedFilters.level !== 'all',
		Boolean(appliedFilters.service),
		Boolean(appliedFilters.search),
		Boolean(appliedFilters.correlationId),
	].filter(Boolean).length;

	return (
		<Card className="animate-none overflow-hidden border-stone-200/90 bg-white/95 shadow-[0_20px_55px_rgba(15,23,42,0.08)] transition-none hover:scale-100 hover:shadow-[0_20px_55px_rgba(15,23,42,0.08)] active:scale-100 dark:border-white/10 dark:bg-[#111113] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)] dark:hover:shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
			<CardHeader className="border-b border-stone-200/80 bg-[linear-gradient(180deg,rgba(245,245,244,0.7),rgba(255,255,255,0.92))] pb-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(17,17,19,0.96))]">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<CardTitle className="text-2xl tracking-tight">Operational Logs</CardTitle>
							<Badge
								variant="outline"
								className="border-stone-300 bg-stone-100 text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-300"
							>
								{activeFilterCount} active filters
							</Badge>
						</div>
						<CardDescription className="max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
							A focused stream of the backend events that matter: Telegram ingest,
							Gemini outcomes, Amazon image result, and server warnings or errors.
						</CardDescription>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-2 text-xs text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300">
							<Waves className={cn('h-3.5 w-3.5', liveEnabled ? 'text-emerald-500' : 'text-stone-400')} />
							<span>{liveEnabled ? 'Live stream active' : 'Live stream paused'}</span>
						</div>
						<Button
							variant="outline"
							onClick={() => setLiveEnabled((current) => !current)}
							disabled={!enabled}
							className="border-stone-300 bg-white/80 text-stone-900 hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
						>
							{liveEnabled ? (
								<Pause className="mr-2 h-4 w-4" />
							) : (
								<Play className="mr-2 h-4 w-4" />
							)}
							{liveEnabled ? 'Pause Live' : 'Resume Live'}
						</Button>
						<Button
							variant="outline"
							onClick={() => void loadLogs('replace')}
							disabled={!enabled || isLoading}
							className="border-stone-300 bg-white/80 text-stone-900 hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
						>
							<RefreshCcw className="mr-2 h-4 w-4" />
							Refresh
						</Button>
					</div>
				</div>

				<div className="mt-2 grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
					<div className="rounded-3xl border border-stone-200/80 bg-stone-50/85 p-4 dark:border-white/10 dark:bg-white/[0.035]">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-500">
							Log Health
						</p>
						<div className="mt-3 grid grid-cols-3 gap-3">
							<div>
								<p className="text-2xl font-semibold">{countByLevel(logs, 'all')}</p>
								<p className="text-xs text-stone-500 dark:text-stone-400">Visible</p>
							</div>
							<div>
								<p className="text-2xl font-semibold text-amber-600 dark:text-amber-300">
									{countByLevel(logs, 'warn')}
								</p>
								<p className="text-xs text-stone-500 dark:text-stone-400">Warn</p>
							</div>
							<div>
								<p className="text-2xl font-semibold text-rose-600 dark:text-rose-300">
									{countByLevel(logs, 'error')}
								</p>
								<p className="text-xs text-stone-500 dark:text-stone-400">Error</p>
							</div>
						</div>
					</div>

					<div className="lg:col-span-3 grid gap-3 md:grid-cols-4">
						<Select value={levelDraft} onValueChange={(value: LevelFilter) => setLevelDraft(value)}>
							<SelectTrigger className="h-11 border-stone-200 bg-white text-stone-900 dark:border-white/10 dark:bg-white/[0.035] dark:text-stone-100">
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
							value={serviceDraft}
							onChange={(event) => setServiceDraft(event.target.value)}
							className="h-11 border-stone-200 bg-white dark:border-white/10 dark:bg-white/[0.035]"
						/>
						<Input
							placeholder="Search message or event"
							value={searchDraft}
							onChange={(event) => setSearchDraft(event.target.value)}
							className="h-11 border-stone-200 bg-white dark:border-white/10 dark:bg-white/[0.035]"
						/>
						<Input
							placeholder="Correlation ID"
							value={correlationDraft}
							onChange={(event) => setCorrelationDraft(event.target.value)}
							className="h-11 border-stone-200 bg-white dark:border-white/10 dark:bg-white/[0.035]"
						/>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<Button
						onClick={handleApplyFilters}
						disabled={!enabled || isLoading}
						className="bg-stone-950 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
					>
						<Search className="mr-2 h-4 w-4" />
						Apply Filters
					</Button>
					<Button
						variant="ghost"
						onClick={handleClearFilters}
						className="text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/10"
					>
						Clear
					</Button>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				{!enabled ? (
					<div className="flex min-h-[460px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,245,244,0.9),transparent_50%)] p-8 dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.035),transparent_55%)]">
						<div className="max-w-md rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/80 p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
							<p className="text-lg font-medium">Admin login required</p>
							<p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
								Sign in to inspect live backend activity and recent history.
							</p>
						</div>
					</div>
				) : (
					<>
						{error ? (
							<div className="mx-6 mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
								<AlertCircle className="h-4 w-4" />
								<span>{error}</span>
							</div>
						) : null}

						<ScrollArea className="h-[720px]">
							<div className="space-y-4 p-6">
								{isLoading && logs.length === 0 ? (
									<div className="flex items-center justify-center py-20 text-sm text-stone-500 dark:text-stone-400">
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Loading logs...
									</div>
								) : null}

								{!isLoading && logs.length === 0 ? (
									<div className="py-20 text-center text-sm text-stone-500 dark:text-stone-400">
										No logs matched the current filters.
									</div>
								) : null}

								{logs.map((entry) => {
									const theme = levelThemes[entry.level] || levelThemes.info;

									return (
										<article
											key={getLogIdentity(entry)}
											className={cn(
												'relative overflow-hidden rounded-[1.75rem] border bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:bg-[#161618] dark:shadow-[0_20px_45px_rgba(0,0,0,0.35)]',
												theme.ring,
											)}
										>
											<div
												className={cn(
													'pointer-events-none absolute inset-0 bg-gradient-to-br',
													theme.accent,
												)}
											/>
											<div className="relative">
												<div className="mb-3 flex flex-wrap items-center gap-2">
													<Badge variant={theme.badge}>{entry.level.toUpperCase()}</Badge>
													<Badge
														variant="outline"
														className="border-stone-300 bg-stone-100/80 text-stone-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-300"
													>
														{entry.service}
													</Badge>
													{entry.event ? (
														<Badge
															variant="outline"
															className="border-stone-300 bg-white/80 text-stone-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-stone-400"
														>
															{entry.event}
														</Badge>
													) : null}
													<span className="ml-auto text-xs text-stone-500 dark:text-stone-400">
														{formatTimestamp(entry.timestamp)}
													</span>
												</div>

												<p className="text-[15px] font-medium leading-7 text-stone-900 dark:text-stone-100">
													{entry.message}
												</p>

												<div className="mt-4 grid gap-2 text-xs text-stone-500 dark:text-stone-400 md:grid-cols-2">
													<div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
														<span className="font-medium text-stone-700 dark:text-stone-300">
															Correlation:
														</span>{' '}
														{entry.correlationId || 'None'}
													</div>
													<div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
														<span className="font-medium text-stone-700 dark:text-stone-300">
															Request:
														</span>{' '}
														{entry.requestId || 'None'}
													</div>
												</div>

												{entry.context && Object.keys(entry.context).length > 0 ? (
													<pre className="mt-4 overflow-x-auto rounded-[1.25rem] border border-stone-200/80 bg-stone-950 p-4 text-xs leading-6 text-stone-100 dark:border-white/10">
														{JSON.stringify(entry.context, null, 2)}
													</pre>
												) : null}
											</div>
										</article>
									);
								})}
							</div>
						</ScrollArea>

						<div className="flex flex-col gap-3 border-t border-stone-200/80 bg-stone-50/75 px-6 py-4 text-xs text-stone-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-stone-400 md:flex-row md:items-center md:justify-between">
							<p>
								Newest logs appear first. Recent logs come from Redis; older persisted
								history comes from Mongo.
							</p>
							<Button
								variant="outline"
								onClick={() => void loadLogs('append')}
								disabled={!hasMore || isLoading}
								className="border-stone-300 bg-white text-stone-900 hover:bg-stone-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-stone-100 dark:hover:bg-white/10"
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
