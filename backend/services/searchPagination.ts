import { createHash, randomUUID } from 'node:crypto';
import type TelegramMessage from '../models/TelegramMessage';
import SearchSession from '../models/SearchSession';
import type { MessageQueryOptions } from './telegramTypes';
import { getMessagesFromStore } from './telegramMessageQuery';
import { SearchCursorError, DEAL_SEARCH_SNAPSHOT_LIMIT } from '../utils/dealSearch';

const SESSION_MS = 120_000;
type Session = { _id: string; fingerprint: string; ids: string[]; createdAt: Date; expiresAt: Date };
export type SearchSessionRepository = {
  save: (session: Session) => Promise<void>;
  load: (id: string) => Promise<Session | null>;
};

const repository: SearchSessionRepository = {
  async save(session) {
    await SearchSession.create(session);
    // Bound retained snapshots across application instances, not just one process.
    const oldest = await SearchSession.find().sort({ createdAt: -1, _id: -1 }).skip(64).select('_id').lean();
    if (oldest.length) await SearchSession.deleteMany({ _id: { $in: oldest.map((row) => row._id) } });
  },
  async load(id) {
    const row = await SearchSession.findById(id).lean();
    return row ? { ...row, ids: row.ids.map(String) } : null;
  },
};

export async function paginateSearch<T extends { _id: unknown }>(
  options: MessageQueryOptions,
  captureIds: () => Promise<string[]>,
  readRows: (ids: string[]) => Promise<T[]>,
  sessions: SearchSessionRepository = repository,
) {
  const fingerprint = createHash('sha256').update(JSON.stringify([
    options.search?.trim().toLowerCase(), options.channelId || '', options.category || '',
    options.from || '', options.to || '', options.minPrice || '', options.maxPrice || '', options.sort || '',
  ])).digest('hex');
  const limit = Math.min(50, Math.max(1, parseInt(String(options.limit), 10) || 10));
  let session: Session;
  let offset = 0;
  if (options.cursor) {
    try {
      if (options.cursor.length > 256) throw new SearchCursorError();
      const cursor = JSON.parse(Buffer.from(options.cursor, 'base64url').toString()) as { v: number; s: string; o: number };
      if (!cursor || cursor.v !== 3 || typeof cursor.s !== 'string' || !Number.isInteger(cursor.o) || cursor.o < 1) throw new SearchCursorError();
      session = await sessions.load(cursor.s);
      offset = cursor.o;
      if (!session || session.expiresAt.getTime() <= Date.now() || session.fingerprint !== fingerprint || offset >= session.ids.length) throw new SearchCursorError();
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof SearchCursorError) throw new SearchCursorError();
      throw error;
    }
  } else {
    const ids = await captureIds();
    if (ids.length > DEAL_SEARCH_SNAPSHOT_LIMIT) throw new Error('Too many search matches. Refine your search or filters.');
    session = { _id: randomUUID(), fingerprint, ids, createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_MS) };
    if (ids.length > limit) await sessions.save(session);
  }
  const ids = session.ids.slice(offset, offset + limit);
  const rows = await readRows(ids);
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const data = ids.flatMap((id) => byId.has(id) ? [{ ...byId.get(id)!, id }] : []);
  const hasMore = offset + limit < session.ids.length;
  return {
    data, hasMore, totalDealsCount: session.ids.length,
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ v: 3, s: session._id, o: offset + limit })).toString('base64url') : null,
  };
}

export function getSearchPage(store: typeof TelegramMessage, options: MessageQueryOptions) {
  return paginateSearch(options, async () => {
    const result = await getMessagesFromStore(store, { ...options, cursor: undefined, captureIds: true });
    if (result.hasMore) throw new Error('Too many search matches. Refine your search or filters.');
    return result.data.map((row) => row.id);
  }, async (ids) => ids.length ? store.find({ _id: { $in: ids } })
    .select('messageId text date link imageUrl telegramFileId channelId category price clicks createdAt')
    .maxTimeMS(4500).lean() : []);
}
