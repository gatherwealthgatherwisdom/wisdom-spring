export enum FeatureFlagKey {
  USER_MODEL_PICKER = "user_model_picker",
  IMAGE_GEN = "image_gen",
  VISION = "vision",
  PDF_UPLOAD = "pdf_upload",
  WEB_SEARCH = "web_search",
  VOICE_UI = "voice_ui",
}

export const FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  [FeatureFlagKey.USER_MODEL_PICKER]: false,
  [FeatureFlagKey.IMAGE_GEN]: true,
  [FeatureFlagKey.VISION]: true,
  [FeatureFlagKey.PDF_UPLOAD]: true,
  [FeatureFlagKey.WEB_SEARCH]: true,
  [FeatureFlagKey.VOICE_UI]: true,
};

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.values(FeatureFlagKey).includes(value as FeatureFlagKey);
}

export function publicFlagItems(rows: Array<{ key: string; enabled: boolean }>): Array<{ key: string; enabled: boolean }> {
  const stored = new Map(rows.map((row) => [row.key, row.enabled]));
  return Object.values(FeatureFlagKey).map((key) => ({
    key,
    enabled: stored.get(key) ?? FLAG_DEFAULTS[key],
  }));
}
