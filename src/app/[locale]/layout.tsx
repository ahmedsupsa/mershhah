import { notFound } from 'next/navigation';
import { LanguageProvider } from '@/components/shared/LanguageContext';

const locales = ['ar', 'en'] as const;
type Locale = typeof locales[number];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  
  if (!locales.includes(locale)) {
    notFound();
  }

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = locale === 'ar' ? 'font-body' : 'font-sans';

  return (
    <div lang={locale} dir={dir} className={fontClass}>
      <LanguageProvider initialLocale={locale}>
        {children}
      </LanguageProvider>
    </div>
  );
}
