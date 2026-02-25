import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ptTranslations from './locales/pt.json';
import enTranslations from './locales/en.json';

export type Lang = 'pt' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  pt: ptTranslations,
  en: enTranslations,
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key. Supports interpolation: t('key', { name: 'John' }) replaces {name}. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'pt',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('imobiliaria_lang');
    return (saved === 'en' ? 'en' : 'pt') as Lang;
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('imobiliaria_lang', l);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = translations[lang][key] || translations['pt'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return value;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
