import React from 'react';
import { useTranslation } from 'react-i18next';

type Language = 'en' | 'hi' | 'te' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

/**
 * Bridge: wraps react-i18next so existing components using useLanguage()
 * continue to work without changes. New components can use useTranslation() directly.
 */
export function useLanguage(): LanguageContextType {
  const { t, i18n } = useTranslation();
  return {
    language: i18n.language as Language,
    setLanguage: (lang: Language) => i18n.changeLanguage(lang),
    t: (key: string) => t(key),
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
