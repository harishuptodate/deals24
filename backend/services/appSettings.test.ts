import assert from 'node:assert/strict';
import test from 'node:test';
import { getGeminiIdentityEnvironmentDefault } from './appSettings';

test('Gemini identity extraction defaults on to preserve current ingestion behavior', () => {
  const previousValue = process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED;
  delete process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED;
  assert.equal(getGeminiIdentityEnvironmentDefault(), true);
  if (previousValue === undefined) delete process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED;
  else process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED = previousValue;
});

test('Gemini identity extraction can be disabled by environment', () => {
  const previousValue = process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED;
  process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED = 'false';
  assert.equal(getGeminiIdentityEnvironmentDefault(), false);
  if (previousValue === undefined) delete process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED;
  else process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED = previousValue;
});
