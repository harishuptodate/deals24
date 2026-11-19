import type { AdminLogEntry } from '@/services/api';
import { getTelegramIdentity } from './adminLogGroups';

// Console output can contain a JSON caption or object after a human-readable prefix.
export function parseLogMessage(message: string): { heading: string; body: unknown } {
  for (let index = 0; index < message.length; index += 1) {
    if (!['"', '{', '['].includes(message[index])) continue;
    try {
      return { heading: message.slice(0, index).trim().replace(/:$/, ''), body: JSON.parse(message.slice(index)) };
    } catch { /* A bracket or quote may belong to the prefix. */ }
  }
  const caption = message.match(/^([\s\S]*?:\s*)"([\s\S]*)$/);
  if (caption) return {
    heading: caption[1].trim().replace(/:$/, ''),
    body: caption[2].replace(/\\(r\\n|n|r|t|")/g, (_, escape: string) => (
      ({ 'r\\n': '\n', n: '\n', r: '\n', t: '\t', '"': '"' })[escape]
    )),
  };
  return { heading: '', body: message };
}

export type LogHistoryStep = {
  entry: AdminLogEntry;
  originals: AdminLogEntry[];
};

export function buildLogHistory(entries: AdminLogEntry[]): LogHistoryStep[] {
  const steps: LogHistoryStep[] = [];
  let image: { step: LogHistoryStep; error?: string; fallback: boolean; photo: boolean } | undefined;
  let updated = false;
  for (const original of entries) {
    const entry = { ...original, context: { ...original.context } };
    const message = entry.message;
    const failure = entry.event === 'amazon_image_fetch_failed' || /^Amazon image fetch failed\.?$/.test(message)
      ? (typeof entry.context.error === 'string' ? entry.context.error : message)
      : message.match(/^Failed to fetch Amazon image:\s*(.+)$/)?.[1];
    const fallback = /^Falling back to Telegram image\.?$/.test(message);
    const extracting = message === 'Message contains Telegram photo, extracting file ID';
    const fileId = message.match(/^Extracted Telegram file ID:\s*(\S+)/)?.[1];

    if (failure || fallback || extracting || fileId) {
      // Consolidate only this known image-resolution sequence, never unrelated errors or retries.
      if (!image || (failure && image.error && failure !== image.error)
        || entry.context.source !== image.step.entry.context?.source
        || entry.correlationId !== image.step.entry.correlationId
        || (entry.context.amazonUrl && image.step.entry.context?.amazonUrl && entry.context.amazonUrl !== image.step.entry.context.amazonUrl)) {
        const step = { entry, originals: [] };
        steps.push(step);
        image = { step, fallback: false, photo: false };
      }
      image.step.originals.push(original);
      image.step.entry.context = { ...image.step.entry.context, ...entry.context };
      if (entry.level === 'error' || (entry.level === 'warn' && image.step.entry.level !== 'error')) image.step.entry.level = entry.level;
      if (failure) image.error = failure;
      if (fallback) image.fallback = true;
      if (fileId) {
        image.photo = true;
        image.step.entry.context.telegramFileId = fileId;
      }
      image.step.entry.message = [
        image.error ? `Amazon image unavailable: ${image.error.replace(/\.$/, '')}.` : '',
        image.photo ? 'Used Telegram photo.' : image.fallback ? 'Falling back to Telegram image.' : extracting ? 'Extracting Telegram photo.' : '',
      ].filter(Boolean).join(' ');
      if (image.error === image.step.entry.context.error) delete image.step.entry.context.error;
      image.step.entry.event = null;
      continue;
    }
    image = undefined;
    if (/^Received (?:webhook update|(?:message|channel post) through polling):/.test(message)) updated = false;
    if (/^Updated existing product price history:/.test(message)) updated = true;
    const saving = message.match(/^Saving new message with category:\s*(.*?)\s+and image data:/);
    if (saving) {
      const payload = parseLogMessage(message).body;
      entry.context = { ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}), ...entry.context, category: saving[1] };
      entry.message = 'Saving deal';
    }
    if (/^(?:Message|Channel post) saved successfully:/.test(message)) {
      entry.message = updated ? 'Deal updated' : 'Deal saved';
      const knownText = steps.map((step) => {
        const body = parseLogMessage(step.entry.message).body;
        return typeof body === 'string' ? body : '';
      }).join('\n');
      const newLinks = (message.match(/https?:\/\/[^\s"<>]+/g) || []).filter((url) => !knownText.includes(url));
      if (newLinks.length) entry.context.savedLinks = [...new Set(newLinks)];
      const previous = steps[steps.length - 1];
      if (previous?.entry.message === 'Saving deal' && previous.entry.context?.source === entry.context.source
        && previous.entry.correlationId === entry.correlationId) {
        previous.originals.push(original);
        previous.entry = { ...entry, context: { ...previous.entry.context, ...entry.context } };
        continue;
      }
    }
    if (message === 'Successfully generated caption and category using Gemini API') entry.message = 'Caption and category generated';
    if (entry.event === 'gemini_deal_enrichment') entry.event = null;
    steps.push({ entry, originals: [original] });
  }

  const seenResources = new Set<string>();
  return steps.map((step) => {
    const entry = { ...step.entry };
    const body = parseLogMessage(entry.message).body;
    if (typeof body === 'string') {
      for (const url of body.match(/https?:\/\/[^\s"<>]+/g) || []) seenResources.add(url);
    }
    const clean = (value: unknown, key: string): unknown => {
      if (key === 'imageUrl' && (value == null || value === '')) return undefined;
      if (key === 'sourceKey' && typeof value === 'string' && value.endsWith(`:${getTelegramIdentity(entry)?.id}`)) return undefined;
      if (typeof value === 'string' && (key === 'telegramFileId' || /^https?:\/\//.test(value))) {
        if (seenResources.has(value)) return undefined;
        seenResources.add(value);
      }
      if (key === 'savedLinks' && Array.isArray(value)) {
        const links = value.map((item) => clean(item, 'url')).filter((item) => item !== undefined);
        return links.length ? links : undefined;
      }
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [name, clean(item, name)]).filter(([, item]) => item !== undefined),
      );
      return value;
    };
    entry.context = clean(entry.context, '') as Record<string, unknown>;
    return { entry, originals: step.originals };
  });
}
