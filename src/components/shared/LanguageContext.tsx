'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations, type Locale } from '@/lib/i18n/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'ar';
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  const locale = match?.[1];
  if (locale === 'en' || locale === 'ar') return locale;
  return 'ar';
}

function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function LanguageProvider({ 
  children, 
  initialLocale,
}: { 
  children: React.ReactNode; 
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || 'ar');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialLocale) {
      const cookieLocale = getLocaleFromCookie();
      setLocaleState(cookieLocale);
    }
    setMounted(true);
  }, [initialLocale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocaleState(newLocale);
    setLocaleCookie(newLocale);
    
    const segments = pathname.split('/');
    if (segments[1] === 'ar' || segments[1] === 'en') {
      segments[1] = newLocale;
      router.push(segments.join('/'));
    } else {
      router.refresh();
    }
  }, [locale, pathname, router]);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    for (const k of keys) {
      if (value === undefined) return key;
      value = value[k];
    }
    return typeof value === 'string' ? value : key;
  }, [locale]);

  const isRTL = locale === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: 'ar',
      setLocale: () => {},
      t: (key: string) => key,
      isRTL: true,
      dir: 'rtl',
    };
  }
  return context;
}
