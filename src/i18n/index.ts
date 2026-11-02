import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import sq from '../locales/sq.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import { langFromPath } from '../lib/lang';

export const resources = { sq: { translation: sq }, en: { translation: en }, de: { translation: de } } as const;

i18n.use(initReactI18next).init({
  resources,
  lng: langFromPath(window.location.pathname).lang,
  fallbackLng: 'sq',
  interpolation: { escapeValue: false },
  returnObjects: false,
});

export default i18n;
