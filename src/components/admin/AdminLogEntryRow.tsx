import { adminLogButtonClassName } from '@/components/admin/adminLogStyles';
import { Fragment, useId, useState } from 'react';
import { AlertTriangle, Bug, ChevronRight, CircleX, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdminLogEntry } from '@/services/api';
import { getLogIdentity, getTelegramIdentity } from './adminLogGroups';
import { buildLogHistory, parseLogMessage as parseMessage } from './adminLogHistory';

const levels = {
	debug: { label: 'Debug', icon: Bug },
	info: { label: 'Info', icon: Info },
	warn: { label: 'Warn', icon: AlertTriangle },
	error: { label: 'Error', icon: CircleX },
};

const formatLabel = (key: string) => {
	const label = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
	return label.charAt(0).toUpperCase() + label.slice(1);
};

const isInlineValue = (value: unknown) => (
	(value === null || typeof value !== 'object')
	&& (typeof value !== 'string' || (value.length <= 80 && !/[\r\n]/.test(value)))
);

function repeatedValue<T extends string>(values: (T | undefined)[]) {
	const counts = new Map<T, number>();
	for (const value of values) {
		if (value) counts.set(value, (counts.get(value) || 0) + 1);
	}
	const mostCommon = [...counts].sort((a, b) => b[1] - a[1])[0];
	return mostCommon && mostCommon[1] > 1 ? mostCommon[0] : undefined;
}

type HistoryDefaults = { level?: AdminLogEntry['level']; service?: string; source?: string };

function LogValue({ value, inline = false, horizontal = false, onCopy }: { value: unknown; inline?: boolean; horizontal?: boolean; onCopy?: (label: string, value: string) => void }) {
	if (Array.isArray(value)) {
		return value.length > 0 ? (
			<ol role="list" className={cn(horizontal ? 'log-reasons inline' : 'list-decimal space-y-1 pl-5 marker:text-stone-500')}>
				{value.map((item, index) => <Fragment key={index}>{horizontal ? ' ' : null}<li className={cn("min-w-0 max-w-full", horizontal && "inline-block align-baseline")}><LogValue value={item} onCopy={onCopy} /></li></Fragment>)}
			</ol>
		) : <span className="logs-muted text-[var(--log-muted)]">None</span>;
	}
	if (value !== null && typeof value === 'object') {
		return (
			<dl className={cn("min-w-0 max-w-full flex-wrap items-baseline gap-x-4 gap-y-1.5", inline ? "log-inline-details inline" : "flex")}>
				{Object.entries(value).map(([key, item]) => (
					<Fragment key={key}>{inline ? ' ' : null}<div className={cn('min-w-0 max-w-full gap-1.5', inline ? 'inline-flex align-baseline' : 'flex', key === 'reasons' && Array.isArray(item) ? 'log-reasons-detail basis-full !block' : key === 'telegramFileId' ? 'items-baseline' : isInlineValue(item) ? 'items-baseline' : 'basis-full flex-col gap-1')}>
						<dt className={cn("logs-muted text-[var(--log-muted)] text-xs [overflow-wrap:anywhere]", key === 'reasons' && Array.isArray(item) && "inline")}>{formatLabel(key)}</dt>
						<dd className={cn('min-w-0', key === 'reasons' && Array.isArray(item) ? 'inline' : key === 'telegramFileId' ? '' : !isInlineValue(item) && 'log-datum border-l border-[var(--log-control-border)] pl-2.5')}>{key === 'telegramFileId' && typeof item === 'string' && onCopy ? (
								<Button type="button" variant="ghost" size="sm" aria-label="Copy Telegram file ID" title={item} className="h-auto min-h-11 max-w-full gap-1.5 px-2 text-xs [@container(min-width:43.75rem)]:min-h-8 [@media(pointer:coarse)]:min-h-11" onClick={() => onCopy('Telegram file ID', item)}>
									<span className="min-w-0 truncate font-mono">{item.length > 28 ? `${item.slice(0, 14)}…${item.slice(-8)}` : item}</span><Copy aria-hidden="true" className="h-3 w-3" />
								</Button>
							) : <LogValue value={item} inline={inline && isInlineValue(item)} horizontal={key === 'reasons'} onCopy={onCopy} />}</dd>
					</div></Fragment>
				))}
			</dl>
		);
	}
	return (
		<p className={cn('log-value min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-normal', inline ? 'inline' : 'w-full')}>
			{value === null || value === undefined ? 'Not provided' : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
				: typeof value === 'string' && /https?:\/\//.test(value)
					? value.split(/((?:\u{1F517}[ \t]*)?https?:\/\/[^\s"<>]+)/gu).map((part, index) => /https?:\/\//.test(part) ? <a key={index} href={part.replace(/^\u{1F517}[ \t]*/u, '')} target="_blank" rel="noopener noreferrer" title={part} className="log-url inline-block max-w-full truncate align-bottom text-[var(--log-primary)] underline decoration-current/40 underline-offset-2 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{part}</a> : part.replace(/\n(?:[ \t]*\n)+[ \t]*$/, '\n'))
					: String(value)}
		</p>
	);
}

function LogEntryDetails({ entry, defaults, originals, compactTime = false, onCopy }: { entry: AdminLogEntry; defaults?: HistoryDefaults; originals?: AdminLogEntry[]; compactTime?: boolean; onCopy: (label: string, value: string) => void }) {
	const message = parseMessage(entry.message);
	const context = { ...entry.context };
	if (defaults?.source) {
		if (context.source === defaults.source) delete context.source;
		else if (context.source === undefined) context.source = null;
	}
	const details = Object.entries(context).filter(([key]) => (
		!['telegramMessageId', 'requestId', 'correlationId', 'traceId'].includes(key)
	));
	const inlineDetails = Object.fromEntries(details.filter(([, value]) => isInlineValue(value)));
	const structuredDetails = Object.fromEntries(details.filter(([, value]) => !isInlineValue(value)));
	const date = new Date(entry.timestamp);
	const validDate = !Number.isNaN(date.getTime());
	const fullTimestamp = validDate ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : entry.timestamp;

	return (
		<div className="log-entry-details border-t border-[var(--log-border)] bg-[var(--log-raised)] px-3 py-1 text-[var(--log-ink)]">
			<div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 [@container(min-width:43.75rem)]:gap-x-3">
				<div className="log-message min-w-0 [overflow-wrap:anywhere]">
					{defaults && entry.level !== defaults.level ? <span className={cn('mr-2 text-xs font-semibold', entry.level === 'error' ? 'text-[var(--log-error)]' : entry.level === 'warn' ? 'text-[var(--log-warn)]' : 'text-[var(--log-info)]')}>{levels[entry.level]?.label || 'Info'}</span> : null}
					{defaults && entry.service !== defaults.service ? <span className="mr-2 text-xs text-[var(--log-muted)]">{entry.service || 'App'}</span> : null}
					{message.heading ? <span className="mr-1 text-sm text-[var(--log-muted)]">{message.heading}:</span> : null}
					<LogValue value={message.body} inline={typeof message.body === 'string'} onCopy={onCopy} />
					{entry.event ? <> <span className="text-xs text-[var(--log-muted)]">{formatLabel(entry.event)}</span></> : null}
					{Object.keys(inlineDetails).length > 0 ? <LogValue value={inlineDetails} inline onCopy={onCopy} /> : null}
				</div>
				<div className="log-entry-actions ms-auto flex min-w-0 max-w-full items-center justify-end gap-2">
					<time dateTime={validDate ? date.toISOString() : undefined} title={fullTimestamp} aria-label={fullTimestamp} className="min-w-0 text-right text-xs tabular-nums text-[var(--log-muted)] [overflow-wrap:anywhere]">{compactTime || !validDate ? (validDate ? date.toLocaleTimeString('en-IN', { hour12: false }) : fullTimestamp) : <><span className="[@container(min-width:43.75rem)]:hidden">{date.toLocaleTimeString('en-IN', { hour12: false })}</span><span className="hidden [@container(min-width:43.75rem)]:inline">{fullTimestamp}</span></>}</time>
					<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button logs-copy hidden [@container(min-width:43.75rem)]:inline-flex [@container(min-width:43.75rem)]:min-h-8 [@media(pointer:coarse)]:min-h-11 shrink-0 gap-1.5 px-2 text-xs")} title={originals && originals.length > 1 ? `Copy ${originals.length} original events` : 'Copy original log'} onClick={() => onCopy('Log', JSON.stringify(originals ? originals.length === 1 ? originals[0] : originals : entry, null, 2))}>
						<Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy log
					</Button>
				</div>
			</div>
			{Object.keys(structuredDetails).length > 0 ? (
				<div className="log-structured-details mt-2 border-t border-[var(--log-border)] pt-2">
					<LogValue value={structuredDetails} onCopy={onCopy} />
				</div>
			) : null}
		</div>
	);
}

export default function AdminLogEntryRow({ entry, entries, status, summary, telegramId: groupedTelegramId, onCopy }: {
	entry: AdminLogEntry;
	entries?: AdminLogEntry[];
	status?: string;
	summary?: string;
	telegramId?: string;
	onCopy: (label: string, value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const metadataId = useId();
	const level = levels[entry.level] || levels.info;
	const LevelIcon = level.icon;
	const message = parseMessage(summary || entry.message);
	const preview = (message.heading || (typeof message.body === 'string' ? message.body : entry.message)).split(/\r?\n/)[0];
	const telegramId = groupedTelegramId || getTelegramIdentity(entry)?.id || '';
	const date = new Date(entry.timestamp);
	const validDate = !Number.isNaN(date.getTime());
	const fullTimestamp = validDate ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : entry.timestamp;
	const time = validDate ? date.toLocaleTimeString('en-IN', { hour12: false }) : entry.timestamp;
	const history = entries ? buildLogHistory(entries) : [];
	const historyDates = [...new Set((entries || []).map((event) => {
		const timestamp = new Date(event.timestamp);
		return Number.isNaN(timestamp.getTime()) ? event.timestamp : timestamp.toLocaleDateString('en-IN', { dateStyle: 'medium' });
	}))];
	const compactTime = historyDates.length === 1;
	const defaults: HistoryDefaults = {
		level: repeatedValue(entries?.map((event) => event.level) || []),
		service: repeatedValue(entries?.map((event) => event.service) || []),
		source: repeatedValue(entries?.map((event) => typeof event.context?.source === 'string' ? event.context.source : undefined) || []),
	};

	return (
		<Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
			<li className="log-entry border-b border-[var(--log-border)] last:border-b-0 [--log-level-color:var(--log-info)] [--log-level-bg:var(--log-info-bg)] data-[level=warn]:[--log-level-color:var(--log-warn)] data-[level=warn]:[--log-level-bg:var(--log-warn-bg)] data-[level=error]:[--log-level-color:var(--log-error)] data-[level=error]:[--log-level-bg:var(--log-error-bg)] data-[level=debug]:[--log-level-color:var(--log-debug)] data-[level=debug]:[--log-level-bg:var(--log-debug-bg)]" data-level={entry.level}>
				<div className="log-entry-summary flex items-center pr-1.5 hover:bg-[var(--log-primary-soft)] data-[open=true]:bg-[var(--log-primary-soft)] [@container(min-width:43.75rem)]:pr-3 [@container(max-width:18rem)]:flex-wrap" data-open={isOpen}>
					<CollapsibleTrigger asChild>
						<button type="button" className="log-entry-trigger grid min-h-[3.75rem] min-w-0 flex-1 grid-cols-[0.875rem_minmax(0,1fr)] gap-x-2 gap-y-[0.1875rem] px-2.5 py-1.5 text-start [scroll-margin-block:6rem] focus-visible:!outline-offset-[-3px] [@container(min-width:43.75rem)]:min-h-11 [@container(min-width:43.75rem)]:grid-cols-[0.875rem_3.75rem_4.5rem_6.5rem_minmax(0,1fr)] [@container(min-width:43.75rem)]:items-center [@container(min-width:43.75rem)]:px-3 [@container(max-width:18rem)]:basis-full" aria-label={entries ? `Telegram message ${telegramId}: ${status}. ${entries.length} events. ${preview.slice(0, 100)}` : `Full log: ${preview.slice(0, 100)}`} aria-describedby={metadataId}>
							<ChevronRight aria-hidden="true" className={cn('log-entry-chevron row-span-2 self-center text-[var(--log-muted)] transition-transform motion-reduce:transition-none [transition-duration:160ms] [transition-timing-function:ease] [@container(min-width:43.75rem)]:row-auto h-3.5 w-3.5', isOpen && 'rotate-90')} />
							<span id={metadataId} className="log-entry-meta flex min-w-0 items-center gap-2 [@container(min-width:43.75rem)]:contents [@container(max-width:18rem)]:flex-wrap">
								<span className="log-level inline-flex shrink-0 items-center gap-1 rounded-[0.3125rem] bg-[var(--log-level-bg)] px-[0.3125rem] py-[0.0625rem] text-xs font-semibold leading-normal text-[var(--log-level-color)] [@container(min-width:43.75rem)]:justify-self-start">
									<LevelIcon aria-hidden="true" className="h-3.5 w-3.5" />{level.label}
								</span>
								<time dateTime={validDate ? date.toISOString() : undefined} title={fullTimestamp} className="log-time shrink-0 font-[ui-monospace,SFMono-Regular,Consolas,monospace] text-xs leading-normal tabular-nums text-[var(--log-muted)]">
									{time}
								</time>
								<span className="log-entry-service text-xs leading-normal text-[var(--log-muted)] truncate" title={entry.service || 'App'}>{entry.service || 'App'}</span>
							</span>
							<span className="log-entry-preview line-clamp-1 [overflow-wrap:anywhere] text-sm leading-normal text-[var(--log-ink)]">{status ? <span className="mr-2 font-semibold text-[var(--log-level-color)]">{status}</span> : null}{preview.replace(/\s+/g, ' ').trim() || 'Empty message'}</span>
						</button>
					</CollapsibleTrigger>
					{telegramId ? (
						<button
							type="button"
							onClick={() => onCopy('Telegram message ID', telegramId)}
							aria-label={`Copy Telegram message ID ${telegramId}`}
							title="Copy Telegram message ID"
							className="log-entry-telegram min-h-11 min-w-[4.5rem] max-w-[35%] flex-none rounded-md px-1.5 py-1 text-end text-xs leading-normal text-[var(--log-primary)] [overflow-wrap:anywhere] hover:bg-[var(--log-primary-soft)] hover:underline focus-visible:!outline-offset-[-3px] [@container(min-width:43.75rem)]:w-[5.5rem] [@container(max-width:18rem)]:ml-auto"
						>
							<span className="log-telegram-label block text-[var(--log-muted)] [@container(min-width:43.75rem)]:hidden">Telegram</span>
							<span className="log-telegram-id block font-[ui-monospace,SFMono-Regular,Consolas,monospace] font-semibold tabular-nums">#{telegramId}</span>
							{entries ? <span className="block text-[10px] text-[var(--log-muted)]">{entries.length} {entries.length === 1 ? 'event' : 'events'}</span> : null}
						</button>
					) : null}
				</div>
				<CollapsibleContent>
					{entries ? (
						<div className="border-t border-[var(--log-border)] bg-[var(--log-raised)]">
							<div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-3 py-2 text-xs text-[var(--log-muted)] [@container(min-width:43.75rem)]:flex">
								<div className="contents [@container(min-width:43.75rem)]:flex [@container(min-width:43.75rem)]:min-w-0 [@container(min-width:43.75rem)]:flex-1 [@container(min-width:43.75rem)]:flex-wrap [@container(min-width:43.75rem)]:items-center [@container(min-width:43.75rem)]:gap-x-4 [@container(min-width:43.75rem)]:gap-y-1">
									<span>{historyDates[0]}{historyDates.length > 1 ? ` – ${historyDates[historyDates.length - 1]}` : ''} &middot; {entries.length} events{history.length !== entries.length ? ` in ${history.length} steps` : ''} &middot; Oldest first</span>
									{Object.values(defaults).some(Boolean) ? (
										<p className="log-history-defaults col-span-2 row-start-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 [overflow-wrap:anywhere] [&>span]:min-w-0">
											<span>Unless noted:</span>
											{defaults.level ? <span>{levels[defaults.level].label}</span> : null}
											{defaults.service ? <span>{defaults.service}</span> : null}
											{defaults.source ? <span>Source: {defaults.source}</span> : null}
										</p>
									) : null}
								</div>
								<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button col-start-2 row-start-1 ms-auto shrink-0 px-2 text-xs")} onClick={() => onCopy('Message history', JSON.stringify(entries, null, 2))}><Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy history</Button>
							</div>
							<ol aria-label={`History for Telegram message ${telegramId}`}>
								{history.map(({ entry: event, originals }) => (
									<li key={getLogIdentity(originals[0])}>
										<LogEntryDetails entry={event} defaults={defaults} originals={originals} compactTime={compactTime} onCopy={onCopy} />
									</li>
								))}
							</ol>
						</div>
					) : <LogEntryDetails entry={entry} onCopy={onCopy} />}
				</CollapsibleContent>
			</li>
		</Collapsible>
	);
}
