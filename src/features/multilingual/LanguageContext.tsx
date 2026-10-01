import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { LanguageContext, type SupportedLanguage, SUPPORTED_LANGUAGES, completeTranslations, translations } from './languageState';
interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
}

export function LanguageProvider({ children, defaultLanguage = 'en' }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('cyclone-ai-language') as SupportedLanguage) || defaultLanguage;
    }
    return defaultLanguage;
  });

  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    localStorage.setItem('cyclone-ai-language', currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLangInfo.rtl ? 'rtl' : 'ltr';
    if (currentLangInfo.fontFamily) {
      document.documentElement.style.setProperty('--font-current', currentLangInfo.fontFamily);
    }
  }, [currentLanguage, currentLangInfo]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
  }, []);

  const t = useCallback((key: string) => {
    return completeTranslations[currentLanguage][key] || translations.en[key] || key;
  }, [currentLanguage]);

  const value = {
    currentLanguage,
    setLanguage,
    t,
    availableLanguages: SUPPORTED_LANGUAGES,
    isRTL: currentLangInfo.rtl || false,
    currentFontFamily: currentLangInfo.fontFamily || 'var(--font-sans)',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

