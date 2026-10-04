export type MatchableAlert = {
  type: 'deal' | 'keyword';
  dealId?: string | null;
  keywords?: string[];
  targetPrice?: number | null;
};

export type MatchableDeal = {
  id: string;
  text: string;
  price?: string | number | null;
};

export function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/(\d+)\s*[- ]?\s*inch\b/g, '$1inch')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesKeyword(text: string, keywords: string[]): boolean {
  const normalizedText = ` ${normalizeMatchText(text)} `;

  return keywords.some((keyword) => {
    const tokens = normalizeMatchText(keyword).split(' ').filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => normalizedText.includes(` ${token} `));
  });
}

export function parseDealPrice(value: string | number | null | undefined): number | null {
  const normalized = typeof value === 'number'
    ? value
    : Number(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

export function alertMatchesDeal(alert: MatchableAlert, deal: MatchableDeal): boolean {
  const subjectMatches = alert.type === 'deal'
    ? String(alert.dealId || '') === deal.id
    : matchesKeyword(deal.text, alert.keywords || []);

  if (!subjectMatches) return false;
  if (!alert.targetPrice) return true;

  const dealPrice = parseDealPrice(deal.price);
  return dealPrice !== null && dealPrice <= alert.targetPrice;
}
