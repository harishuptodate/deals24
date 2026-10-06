import assert from 'node:assert/strict';
import test from 'node:test';
import { renderDealAlertEmail, renderMagicLoginEmail } from './emailService';

test('renders a collapsible deal email with image and both actions', () => {
  const html = renderDealAlertEmail({
    to: 'buyer@example.com',
    dealTitle: 'Samsung <65-inch> TV',
    dealText: 'Samsung TV\nLimited offer\nhttps://amazon.in/dp/example',
    price: 49999,
    imageUrl: 'https://images.example.com/tv.jpg',
    buyUrl: 'https://amazon.in/dp/example',
    dealUrl: 'https://deals24.vercel.app/deal/1',
    unsubscribeUrl: 'https://api.example.com/api/alerts/unsubscribe/token',
  });

  assert.match(html, /<details/);
  assert.match(html, /<summary/);
  assert.match(html, /Samsung &lt;65-inch&gt; TV/);
  assert.match(html, /https:\/\/images\.example\.com\/tv\.jpg/);
  assert.match(html, />Buy now</);
  assert.match(html, />View deal</);
  assert.doesNotMatch(html, /https:\/\/amazon\.in\/dp\/example<\/p>/);
});

test('renders a secure magic login email', () => {
  const html = renderMagicLoginEmail({
    email: 'buyer@example.com',
    loginUrl: 'https://deals24.vercel.app/auth/verify?token=abc123',
  });

  assert.match(html, /Sign in to Deals24/);
  assert.match(html, /expires in 15 minutes/);
  assert.match(html, /token=abc123/);
});
