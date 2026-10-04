import AlertDelivery from '../models/AlertDelivery';
import DealAlert from '../models/DealAlert';
import { alertMatchesDeal, parseDealPrice } from './alertMatching';
import { isEmailDeliveryConfigured, sendDealAlertEmail } from './emailService';

type SavedDeal = {
  _id: unknown;
  text?: string | null;
  price?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  telegramFileId?: string | null;
};

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function processDealAlerts(deal: SavedDeal, sourceKey: string): Promise<void> {
  if (!isEmailDeliveryConfigured()) return;

  const dealId = String(deal._id);
  const dealText = String(deal.text || 'New deal');
  const alerts = await DealAlert.find({
    active: true,
    $or: [
      { type: 'deal', dealId: deal._id },
      { type: 'keyword' },
    ],
  });
  const appUrl = (process.env.PUBLIC_APP_URL || 'https://deals24.vercel.app').replace(/\/$/, '');
  const apiUrl = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
  const proxiedImageUrl = deal.telegramFileId && apiUrl
    ? `${apiUrl}/api/amazon/download-image/${encodeURIComponent(deal.telegramFileId)}`
    : null;

  for (const alert of alerts) {
    if (!alertMatchesDeal({
      type: alert.type,
      dealId: alert.dealId ? String(alert.dealId) : null,
      keywords: alert.keywords,
      targetPrice: alert.targetPrice,
    }, {
      id: dealId,
      text: dealText,
      price: deal.price,
    })) continue;

    let delivery;
    try {
      delivery = await AlertDelivery.create({ alertId: alert._id, dealId, sourceKey });
    } catch (error) {
      if (isDuplicateKeyError(error)) continue;
      throw error;
    }

    try {
      const messageId = await sendDealAlertEmail({
        to: alert.email,
        dealTitle: dealText.split('\n')[0].slice(0, 120) || 'New deal',
        dealText,
        price: parseDealPrice(deal.price),
        imageUrl: deal.imageUrl || proxiedImageUrl,
        buyUrl: deal.link || `${appUrl}/deal/${dealId}`,
        dealUrl: `${appUrl}/deal/${dealId}`,
        unsubscribeUrl: `${apiUrl}/api/alerts/unsubscribe/${alert.unsubscribeToken}`,
      });
      delivery.status = 'sent';
      delivery.providerMessageId = messageId;
      await delivery.save();
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';
      await delivery.save();
      console.error('Failed to send deal alert:', error);
    }
  }
}
