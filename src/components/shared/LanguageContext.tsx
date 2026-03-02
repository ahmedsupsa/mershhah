'use client';
import React from 'react';

// مكون وهمي لمنع أخطاء الاستيراد أثناء عملية التراجع
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useLanguage() {
  return {
    locale: 'ar',
    setLocale: () => {},
    t: (key: string) => key,
    isRTL: true,
  };
}
