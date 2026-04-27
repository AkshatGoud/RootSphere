import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import teCommon from './locales/te/common.json';
import taCommon from './locales/ta/common.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    hi: { common: hiCommon },
    te: { common: teCommon },
    ta: { common: taCommon },
  },
  lng: localStorage.getItem('app-language') || 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng);
});

export default i18n;
