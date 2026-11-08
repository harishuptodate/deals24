import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchAmazonProductFallback } from './amazonFallback';
import { fetchProductImage } from '../amazonService';

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

for (const apiFails of [false, true]) {
  test(`uses image API first${apiFails ? ' and falls back to in-house scraper on failure' : ' without scraping on success'}`, async () => {
    const originalFetch = globalThis.fetch;
    const originalEndpoint = process.env.AMAZON_IMAGE_FALLBACK_API_URL;
    delete process.env.AMAZON_IMAGE_FALLBACK_API_URL;
    const requests: string[] = [];
    const amazonUrl = 'https://www.amazon.in/dp/B0FH1WPYMX';
    const imageUrl = 'https://m.media-amazon.com/images/I/example.jpg';

    globalThis.fetch = async (input) => {
      const url = String(input);
      requests.push(url);
      if (url === 'https://amznpf.onrender.com/api/fetch-image') {
        if (apiFails) throw new Error('API unavailable');
        return new Response(JSON.stringify({ success: true, data: { imageUrl } }));
      }
      return new Response(`<img id="landingImage" src="${imageUrl}">`);
    };

    try {
      const result = await fetchProductImage(amazonUrl);
      assert.equal(result.success, true);
      assert.equal(result.imageUrl, imageUrl);
      assert.equal(requests[0], 'https://amznpf.onrender.com/api/fetch-image');
      assert.equal(requests.length, apiFails ? 2 : 1);
      if (apiFails) assert.equal(requests[1], result.amazonUrl);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalEndpoint === undefined) delete process.env.AMAZON_IMAGE_FALLBACK_API_URL;
      else process.env.AMAZON_IMAGE_FALLBACK_API_URL = originalEndpoint;
    }
  });
}
