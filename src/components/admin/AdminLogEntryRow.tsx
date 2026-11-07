import { useState } from 'react';
import { AlertTriangle, Bug, ChevronRight, CircleX, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AdminLogEntry } from '@/services/api';

const levels = {
	debug: { label: 'Debug', icon: Bug, className: 'text-violet-700 dark:text-violet-300' },
	info: { label: 'Info', icon: Info, className: 'text-sky-700 dark:text-sky-300' },
	warn: { label: 'Warn', icon: AlertTriangle, className: 'text-amber-700 dark:text-amber-300' },
	error: { label: 'Error', icon: CircleX, className: 'text-rose-700 dark:text-rose-300' },
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
		) : <span className="text-stone-500">None</span>;
	}
	if (value !== null && typeof value === 'object') {
		return (
			<dl className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-1.5">
				{Object.entries(value).map(([key, item]) => (
					<div key={key} className={cn('flex min-w-0 max-w-full gap-1.5', isInlineValue(item) ? 'items-baseline' : 'basis-full flex-col gap-1')}>
						<dt className="text-xs text-stone-500 [overflow-wrap:anywhere] dark:text-stone-400">{formatLabel(key)}</dt>
						<dd className={cn('min-w-0', !isInlineValue(item) && 'border-l border-stone-200 pl-2.5 dark:border-white/10')}><LogValue value={item} /></dd>
					</div>
				))}
			</dl>
		);
	}
	return (
		<p className="whitespace-pre-wrap text-[13px] leading-5 [overflow-wrap:anywhere]">
			{value === null || value === undefined ? 'Not provided' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
		</p>
	);
}

export default function AdminLogEntryRow({ entry, onCopy }: {
	entry: AdminLogEntry;
	onCopy: (label: string, value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
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
			<li className="log-entry border-b border-stone-200/80 last:border-b-0 dark:border-white/10">
				<div className={cn('log-entry-summary', isOpen && 'bg-stone-50 dark:bg-white/[0.025]')}>
					<CollapsibleTrigger asChild>
						<button type="button" className="log-entry-trigger" aria-label={`Full log: ${preview.slice(0, 100)}`}>
							<ChevronRight aria-hidden="true" className={cn('log-entry-chevron h-3.5 w-3.5 text-stone-400', isOpen && 'rotate-90')} />
							<span className="log-entry-meta">
								<span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-medium', level.className)}>
									<LevelIcon aria-hidden="true" className="h-3.5 w-3.5" />{level.label}
								</span>
								<time dateTime={validDate ? date.toISOString() : undefined} title={fullTimestamp} className="shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
									{time}
								</time>
								<span className="log-entry-service truncate text-xs text-stone-500 dark:text-stone-400">{entry.service || 'App'}</span>
							</span>
							<span className="log-entry-preview text-[13px] leading-5 text-stone-800 dark:text-stone-200">{preview.replace(/\s+/g, ' ').trim() || 'Empty message'}</span>
						</button>
					</CollapsibleTrigger>
					{telegramId ? (
						<button
							type="button"
							onClick={() => onCopy('Telegram message ID', telegramId)}
							aria-label={`Copy Telegram message ID ${telegramId}`}
							title="Copy Telegram message ID"
							className="log-entry-telegram rounded-md px-2 py-1 text-right text-xs text-stone-500 hover:bg-sky-50 hover:text-sky-700 dark:text-stone-400 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
						>
							<span className="block text-[10px] leading-4">Telegram</span>
							<span className="block font-mono font-medium text-sky-700 dark:text-sky-300">#{telegramId}</span>
						</button>
					) : null}
				</div>
				<CollapsibleContent>
					<div className="log-entry-details border-t border-stone-200/70 bg-stone-50/70 px-3 py-2 text-stone-800 dark:border-white/10 dark:bg-white/[0.02] dark:text-stone-200 sm:px-4">
						<LogValue value={message.body} />
						<div className="mt-1.5 flex items-start justify-between gap-2">
							<div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1 pt-1 text-xs text-stone-500 dark:text-stone-400">
								<time dateTime={validDate ? date.toISOString() : undefined} className="[overflow-wrap:anywhere]">{fullTimestamp}</time>
								{entry.event ? <span className="[overflow-wrap:anywhere]">{formatLabel(entry.event)}</span> : null}
								{Object.keys(inlineDetails).length > 0 ? <LogValue value={inlineDetails} /> : null}
							</div>
							<Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1.5 px-1.5 text-xs text-stone-500 dark:text-stone-400" onClick={() => onCopy('Log', JSON.stringify(entry, null, 2))}>
								<Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy log
							</Button>
						</div>
						{Object.keys(structuredDetails).length > 0 ? (
							<div className="mt-2 border-t border-stone-200/70 pt-2 dark:border-white/10">
								<LogValue value={structuredDetails} />
							</div>
						) : null}
					</div>
				</CollapsibleContent>
			</li>
		</Collapsible>
	);
}
