import { adminLogButtonClassName } from '@/components/admin/adminLogStyles';
import { useId, useState } from 'react';
import { AlertTriangle, Bug, ChevronRight, CircleX, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdminLogEntry } from '@/services/api';

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

// Console logs may contain JSON after a text prefix (including quoted Telegram captions).
function parseMessage(message: string): { heading: string; body: unknown } {
	for (let index = 0; index < message.length; index += 1) {
		if (!['"', '{', '['].includes(message[index])) continue;
		try {
			const body: unknown = JSON.parse(message.slice(index));
			return { heading: message.slice(0, index).trim().replace(/:$/, ''), body };
		} catch {
			// Keep looking: an earlier bracket or quote may be part of the text prefix.
		}
	}

	// The logger truncates long strings, which can leave a quoted caption without its closing quote.
	const quotedCaption = message.match(/^([\s\S]*?:\s*)"([\s\S]*)$/);
	if (quotedCaption) {
		return {
			heading: quotedCaption[1].trim().replace(/:$/, ''),
			body: quotedCaption[2].replace(/\\(r\\n|n|r|t|")/g, (_, escape: string) => (
				({ 'r\\n': '\n', n: '\n', r: '\n', t: '\t', '"': '"' })[escape]
			)),
		};
	}

	return { heading: '', body: message };
}

function LogValue({ value }: { value: unknown }) {
	if (Array.isArray(value)) {
		return value.length > 0 ? (
			<ol className="list-decimal space-y-1 pl-5 marker:text-stone-500">
				{value.map((item, index) => <li key={index}><LogValue value={item} /></li>)}
			</ol>
		) : <span className="logs-muted text-[var(--log-muted)]">None</span>;
	}
	if (value !== null && typeof value === 'object') {
		return (
			<dl className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-1.5">
				{Object.entries(value).map(([key, item]) => (
					<div key={key} className={cn('flex min-w-0 max-w-full gap-1.5', isInlineValue(item) ? 'items-baseline' : 'basis-full flex-col gap-1')}>
						<dt className="logs-muted text-[var(--log-muted)] text-xs [overflow-wrap:anywhere]">{formatLabel(key)}</dt>
						<dd className={cn('min-w-0', !isInlineValue(item) && 'log-datum border-l border-[var(--log-control-border)] pl-2.5')}><LogValue value={item} /></dd>
					</div>
				))}
			</dl>
		);
	}
	return (
		<p className="log-value max-w-[80ch] whitespace-pre-wrap [overflow-wrap:anywhere] text-sm leading-normal">
			{value === null || value === undefined ? 'Not provided' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
		</p>
	);
}

export default function AdminLogEntryRow({ entry, onCopy }: {
	entry: AdminLogEntry;
	onCopy: (label: string, value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const metadataId = useId();
	const level = levels[entry.level] || levels.info;
	const LevelIcon = level.icon;
	const message = parseMessage(entry.message);
	const preview = message.heading || (typeof message.body === 'string' ? message.body : entry.message);
	const messageId = entry.context?.telegramMessageId;
	const telegramId = typeof messageId === 'number' || typeof messageId === 'string' ? String(messageId).trim() : '';
	const details = Object.entries(entry.context || {}).filter(([key]) => (
		!['telegramMessageId', 'requestId', 'correlationId', 'traceId'].includes(key)
	));
	const inlineDetails = Object.fromEntries(details.filter(([, value]) => isInlineValue(value)));
	const structuredDetails = Object.fromEntries(details.filter(([, value]) => !isInlineValue(value)));
	const date = new Date(entry.timestamp);
	const validDate = !Number.isNaN(date.getTime());
	const fullTimestamp = validDate ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : entry.timestamp;
	const time = validDate ? date.toLocaleTimeString('en-IN', { hour12: false }) : entry.timestamp;

	return (
		<Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
			<li className="log-entry border-b border-[var(--log-border)] last:border-b-0 [--log-level-color:var(--log-info)] [--log-level-bg:var(--log-info-bg)] data-[level=warn]:[--log-level-color:var(--log-warn)] data-[level=warn]:[--log-level-bg:var(--log-warn-bg)] data-[level=error]:[--log-level-color:var(--log-error)] data-[level=error]:[--log-level-bg:var(--log-error-bg)] data-[level=debug]:[--log-level-color:var(--log-debug)] data-[level=debug]:[--log-level-bg:var(--log-debug-bg)]" data-level={entry.level}>
				<div className="log-entry-summary flex items-center pr-1.5 hover:bg-[var(--log-primary-soft)] data-[open=true]:bg-[var(--log-primary-soft)] [@container(min-width:43.75rem)]:pr-3 [@container(max-width:18rem)]:flex-wrap" data-open={isOpen}>
					<CollapsibleTrigger asChild>
						<button type="button" className="log-entry-trigger grid min-h-[3.75rem] min-w-0 flex-1 grid-cols-[0.875rem_minmax(0,1fr)] gap-x-2 gap-y-[0.1875rem] px-2.5 py-1.5 text-start [scroll-margin-block:6rem] focus-visible:!outline-offset-[-3px] [@container(min-width:43.75rem)]:min-h-11 [@container(min-width:43.75rem)]:grid-cols-[0.875rem_3.75rem_4.5rem_6.5rem_minmax(0,1fr)] [@container(min-width:43.75rem)]:items-center [@container(min-width:43.75rem)]:px-3 [@container(max-width:18rem)]:basis-full" aria-label={`Full log: ${preview.slice(0, 100)}`} aria-describedby={metadataId}>
							<ChevronRight aria-hidden="true" className={cn('log-entry-chevron row-span-2 self-center text-[var(--log-muted)] transition-transform [transition-duration:160ms] [transition-timing-function:ease] [@container(min-width:43.75rem)]:row-auto h-3.5 w-3.5', isOpen && 'rotate-90')} />
							<span id={metadataId} className="log-entry-meta flex min-w-0 items-center gap-2 [@container(min-width:43.75rem)]:contents [@container(max-width:18rem)]:flex-wrap">
								<span className="log-level inline-flex shrink-0 items-center gap-1 rounded-[0.3125rem] bg-[var(--log-level-bg)] px-[0.3125rem] py-[0.0625rem] text-xs font-semibold leading-normal text-[var(--log-level-color)] [@container(min-width:43.75rem)]:justify-self-start">
									<LevelIcon aria-hidden="true" className="h-3.5 w-3.5" />{level.label}
								</span>
								<time dateTime={validDate ? date.toISOString() : undefined} title={fullTimestamp} className="log-time shrink-0 font-[ui-monospace,SFMono-Regular,Consolas,monospace] text-xs leading-normal tabular-nums text-[var(--log-muted)]">
									{time}
								</time>
								<span className="log-entry-service text-xs leading-normal text-[var(--log-muted)] truncate" title={entry.service || 'App'}>{entry.service || 'App'}</span>
							</span>
							<span className="log-entry-preview line-clamp-1 [overflow-wrap:anywhere] text-sm leading-normal text-[var(--log-ink)]">{preview.replace(/\s+/g, ' ').trim() || 'Empty message'}</span>
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
						</button>
					) : null}
				</div>
				<CollapsibleContent>
					<div className="log-entry-details border-t border-[var(--log-border)] bg-[var(--log-raised)] px-3 py-2 text-[var(--log-ink)] [@container(min-width:43.75rem)]:pl-[2.625rem]">
						<LogValue value={message.body} />
						<div className="mt-1.5 flex items-start justify-between gap-2">
							<div className="logs-muted text-[var(--log-muted)] flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 pt-1 text-xs">
								<time dateTime={validDate ? date.toISOString() : undefined} className="[overflow-wrap:anywhere]">{fullTimestamp}</time>
								{entry.event ? <span className="[overflow-wrap:anywhere]">{formatLabel(entry.event)}</span> : null}
								{Object.keys(inlineDetails).length > 0 ? <LogValue value={inlineDetails} /> : null}
							</div>
							<Button variant="ghost" size="sm" className={cn(adminLogButtonClassName, "logs-button logs-copy [@container(min-width:43.75rem)]:min-h-8 [@media(pointer:coarse)]:min-h-11 shrink-0 gap-1.5 px-2 text-xs")} onClick={() => onCopy('Log', JSON.stringify(entry, null, 2))}>
								<Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy log
							</Button>
						</div>
						{Object.keys(structuredDetails).length > 0 ? (
							<div className="log-structured-details mt-2 border-t border-[var(--log-border)] pt-2">
								<LogValue value={structuredDetails} />
							</div>
						) : null}
					</div>
				</CollapsibleContent>
			</li>
		</Collapsible>
	);
}
