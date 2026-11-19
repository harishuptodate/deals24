import type { AdminLogEntry } from '@/services/api';

export const getLogIdentity = (entry: AdminLogEntry) =>
  entry.logId || entry.id || entry._id || `${entry.timestamp}-${entry.level}-${entry.message}`;

export function getTelegramIdentity(entry: AdminLogEntry) {
  const correlation = entry.correlationId?.match(/^tg:([^:]+):(\d+)$/);
  const rawId = entry.context?.telegramMessageId ?? correlation?.[2];
  const id = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId).trim() : '';
  if (!/^\d+$/.test(id)) return null;
  const rawChat = entry.context?.telegramChatId ?? entry.context?.channelId ?? entry.context?.chatId
    ?? (correlation?.[2] === id ? correlation[1] : undefined);
  const chat = typeof rawChat === 'string' || typeof rawChat === 'number' ? String(rawChat) : 'unknown';
  return { id, key: `telegram:${chat}:${id}` };
}

function outcome(entry: AdminLogEntry) {
  if (/^(?:Message|Channel post) saved successfully:/i.test(entry.message)) return 'Saved';
  if (/^Updated existing product price history:/i.test(entry.message)) return 'Updated';
  if (/^(?:Message|Channel post) was not saved \(filtered out by criteria\)/i.test(entry.message)
    || /^Skipping duplicate Telegram (?:source observation|message ID)/i.test(entry.message)) return 'Skipped';
  if (/^Error (?:saving (?:message|channel post)|handling webhook):/i.test(entry.message)) return 'Failed';
  return null;
}

export function groupAdminLogs(logs: AdminLogEntry[]) {
  const groups = new Map<string, { telegramId?: string; entries: AdminLogEntry[] }>();
  const seen = new Set<string>();
  // Reverse first so equal timestamps retain arrival order (the stream prepends new events).
  const chronological = [...logs].reverse().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  for (const entry of chronological) {
    const identity = getLogIdentity(entry);
    if (seen.has(identity)) continue;
    seen.add(identity);
    const telegram = getTelegramIdentity(entry);
    const key = telegram?.key ?? `log:${identity}`;
    const group = groups.get(key) ?? { telegramId: telegram?.id, entries: [] };
    group.entries.push(entry);
    groups.delete(key);
    groups.set(key, group);
  }

  return Array.from(groups, ([key, { telegramId, entries }]) => {
    const latest = entries[entries.length - 1];
    if (!telegramId) return { key, entry: latest, entries, telegramId, status: '', summary: '' };
    const start = entries.map((entry) => /^(?:Received webhook update:|Received (?:message|channel post) through polling:)/i.test(entry.message)).lastIndexOf(true);
    const attempt = start < 0 ? entries : entries.slice(start);
    const terminal = [...attempt].reverse().find((entry) => outcome(entry));
    const errors = entries.filter((entry) => entry.level === 'error').length;
    const warnings = entries.filter((entry) => entry.level === 'warn').length;
    let status = terminal ? outcome(terminal)! : errors ? 'Needs attention' : 'Processing';
    // An update followed by the controller's generic success log is still an update.
    const updated = terminal && outcome(terminal) === 'Saved'
      && attempt.some((entry) => outcome(entry) === 'Updated');
    if (updated) status = 'Updated';
    const issues = errors + warnings;
    const label = issues ? `${status} · ${issues} issue${issues === 1 ? '' : 's'}` : status;
    // Keep specific duplicate reasons instead of the later generic "filtered out" log.
    const duplicate = status === 'Skipped'
      ? [...attempt].reverse().find((entry) => /^Skipping duplicate Telegram /.test(entry.message)) : undefined;
    const summaryMessage = (duplicate ?? terminal ?? latest).message.replace(/^(?:Message|Channel post) saved successfully:\s*/i, '');
    const summary = status === 'Saved' || status === 'Updated'
      ? summaryMessage.split(/\r?\n/)[0].replace(/\s*(?:\u{1f517}\s*)?https?:\/\/\S+/gu, '').trim()
      : summaryMessage;
    const level = status === 'Failed' || (!terminal && errors) ? 'error'
      : issues ? 'warn' : terminal?.level ?? latest.level;
    return { key, entry: { ...latest, level } as AdminLogEntry, entries, telegramId, status: label, summary };
  }).reverse().sort((a, b) => Date.parse(b.entry.timestamp) - Date.parse(a.entry.timestamp));
}
