import assert from 'node:assert/strict';
import test from 'node:test';
import { getGeminiIdentityEnvironmentDefault } from './appSettings';

function withEnvironment(values: Record<string, string | undefined>, verify: () => void) {
  const previousValues = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    verify();
  } finally {
    for (const [key, value] of Object.entries(previousValues)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('combined enrichment defaults on and supports the old deployment variable', () => {
  withEnvironment({ GEMINI_DEAL_ENRICHMENT_ENABLED: undefined, GEMINI_IDENTITY_EXTRACTION_ENABLED: undefined }, () => {
    assert.equal(getGeminiIdentityEnvironmentDefault(), true);
  });
  withEnvironment({ GEMINI_DEAL_ENRICHMENT_ENABLED: undefined, GEMINI_IDENTITY_EXTRACTION_ENABLED: 'false' }, () => {
    assert.equal(getGeminiIdentityEnvironmentDefault(), false);
  });
});

test('the combined enrichment variable takes precedence over the legacy default', () => {
  withEnvironment({ GEMINI_DEAL_ENRICHMENT_ENABLED: 'false', GEMINI_IDENTITY_EXTRACTION_ENABLED: 'true' }, () => {
    assert.equal(getGeminiIdentityEnvironmentDefault(), false);
  });
  withEnvironment({ GEMINI_DEAL_ENRICHMENT_ENABLED: 'true', GEMINI_IDENTITY_EXTRACTION_ENABLED: 'false' }, () => {
    assert.equal(getGeminiIdentityEnvironmentDefault(), true);
  });
});
