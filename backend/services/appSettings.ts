import AppSetting from '../models/AppSetting';

const GEMINI_IDENTITY_SETTING = 'gemini_identity_extraction_enabled';

export type GeminiIdentitySetting = {
  enabled: boolean;
  source: 'environment' | 'admin';
};

export function getGeminiIdentityEnvironmentDefault(): boolean {
  return (process.env.GEMINI_DEAL_ENRICHMENT_ENABLED
    ?? process.env.GEMINI_IDENTITY_EXTRACTION_ENABLED) !== 'false';
}

export async function getGeminiIdentitySetting(): Promise<GeminiIdentitySetting> {
  const setting = await AppSetting.findOne({ key: GEMINI_IDENTITY_SETTING }).lean();
  if (setting && typeof setting.booleanValue === 'boolean') {
    return { enabled: setting.booleanValue, source: 'admin' };
  }

  return {
    enabled: getGeminiIdentityEnvironmentDefault(),
    source: 'environment',
  };
}

export async function setGeminiIdentitySetting(enabled: boolean): Promise<GeminiIdentitySetting> {
  await AppSetting.findOneAndUpdate(
    { key: GEMINI_IDENTITY_SETTING },
    { $set: { booleanValue: enabled } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { enabled, source: 'admin' };
}
