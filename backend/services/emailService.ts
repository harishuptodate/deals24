type DealAlertEmail = {
  to: string;
  dealTitle: string;
  dealText: string;
  price: number | null;
  imageUrl: string | null;
  buyUrl: string;
  dealUrl: string;
  unsubscribeUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character);
}

function safeHttpUrl(value: string | null | undefined): string {
  try {
    const url = new URL(value || '');
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function renderDealAlertEmail(input: DealAlertEmail): string {
  const title = escapeHtml(input.dealTitle);
  const imageUrl = safeHttpUrl(input.imageUrl);
  const buyUrl = safeHttpUrl(input.buyUrl) || safeHttpUrl(input.dealUrl);
  const dealUrl = safeHttpUrl(input.dealUrl);
  const unsubscribeUrl = safeHttpUrl(input.unsubscribeUrl);
  const description = input.dealText
    .split('\n')
    .slice(1)
    .join('\n')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 500);
  const priceLine = input.price
    ? `<p style="font-size:24px;font-weight:800;color:#16a34a;margin:16px 0 8px;">₹${input.price.toLocaleString('en-IN')}</p>`
    : '';
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${title}" width="240" style="display:block;width:100%;max-width:240px;height:auto;max-height:240px;object-fit:contain;margin:18px auto;border-radius:14px;" />`
    : '';
  const descriptionBlock = description
    ? `<p style="color:#52525b;font-size:14px;line-height:1.65;margin:12px 0 18px;white-space:pre-line;">${escapeHtml(description)}</p>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;color:#18181b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">A new Deals24 offer matches your alert.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ff;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #ddd6fe;border-radius:22px;overflow:hidden;box-shadow:0 12px 36px rgba(76,29,149,.10);">
          <tr><td style="padding:22px 24px;background:#18181b;background-image:linear-gradient(135deg,#18181b,#312e81);color:#ffffff;">
            <p style="font-size:12px;letter-spacing:1.5px;font-weight:800;margin:0;color:#c4b5fd;">DEALS24 ALERT</p>
            <p style="font-size:13px;margin:6px 0 0;color:#e4e4e7;">A deal matched your notification settings</p>
          </td></tr>
          <tr><td style="padding:22px 24px 26px;">
            <details style="border:1px solid #e4e4e7;border-radius:16px;background:#fafafa;overflow:hidden;">
              <summary style="cursor:pointer;list-style:none;padding:18px;font-size:20px;line-height:1.35;font-weight:800;color:#18181b;">
                ${title} <span style="float:right;color:#7c3aed;font-size:18px;">&#9662;</span>
              </summary>
              <div style="border-top:1px solid #e4e4e7;padding:4px 18px 20px;text-align:center;">
                ${image}
                ${priceLine}
                ${descriptionBlock}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px auto 0;">
                  <tr>
                    <td style="padding:4px;"><a href="${escapeHtml(buyUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:800;">Buy now</a></td>
                    <td style="padding:4px;"><a href="${escapeHtml(dealUrl)}" style="display:inline-block;background:#ede9fe;color:#5b21b6;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:800;">View deal</a></td>
                  </tr>
                </table>
              </div>
            </details>
            <p style="font-size:12px;color:#71717a;text-align:center;margin:18px 0 0;line-height:1.5;">
              Tap the deal title to see its image and actions. Some email apps may show the card expanded.
            </p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#71717a;text-align:center;margin:16px 0 0;">
          You received this because you enabled a Deals24 alert.
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b21b6;">Turn off this alert</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

export async function sendDealAlertEmail(input: DealAlertEmail): Promise<string> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) throw new Error('Brevo email delivery is not configured');

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Deals24',
        email: senderEmail,
      },
      to: [{ email: input.to }],
      subject: `Deal alert: ${input.dealTitle.slice(0, 80)}`,
      htmlContent: renderDealAlertEmail(input),
      textContent: `${input.dealTitle}\n${input.price ? `₹${input.price.toLocaleString('en-IN')}\n` : ''}Buy: ${input.buyUrl}\nView: ${input.dealUrl}`,
    }),
  });

  const data = await response.json() as { messageId?: string; message?: string };
  if (!response.ok) throw new Error(data.message || `Brevo returned ${response.status}`);
  return data.messageId || '';
}
