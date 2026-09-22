import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAmazonProductFallback } from './amazonFallback';

test('calls the fallback API with POST and returns product data', async () => {
  const originalFetch = globalThis.fetch;
  let request: RequestInit | undefined;

  globalThis.fetch = async (_input, init) => {
    request = init;
    return new Response(JSON.stringify({
      success: true,
      data: {
        imageUrl: 'https://m.media-amazon.com/images/I/example.jpg',
        title: 'Example Product',
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const result = await fetchAmazonProductFallback(
      'https://www.amazon.in/dp/B0FH1WPYMX?tag=harishch-21',
      'https://fallback.example/api/fetch-image',
    );

    assert.equal(request?.method, 'POST');
    assert.deepEqual(JSON.parse(String(request?.body)), {
      amazonUrl: 'https://www.amazon.in/dp/B0FH1WPYMX?tag=harishch-21',
      retries: 1,
    });
    assert.deepEqual(result, {
      imageUrl: 'https://m.media-amazon.com/images/I/example.jpg',
      title: 'Example Product',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('surfaces a fallback API error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: 'Amazon blocked the request' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );

  try {
    await assert.rejects(
      fetchAmazonProductFallback(
        'https://www.amazon.in/dp/B0FH1WPYMX?tag=harishch-21',
        'https://fallback.example/api/fetch-image',
      ),
      /Amazon blocked the request/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
