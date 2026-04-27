export const LANG_OPTIONS = [
  { code: "en", label: "🇺🇸 English" },
  { code: "hi", label: "🇮🇳 हिंदी" },
  { code: "te", label: "🇮🇳 తెలుగు" },
  { code: "ta", label: "🇮🇳 தமிழ்" },
] as const;

export type LangCode = (typeof LANG_OPTIONS)[number]["code"];
