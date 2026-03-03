'use client';
import { useLanguage } from './LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('settings.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLocale('ar')}
          className={locale === 'ar' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇸🇦</span>
          العربية
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLocale('en')}
          className={locale === 'en' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageSwitcherSimple() {
  const { locale, setLocale } = useLanguage();

  const toggleLocale = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale} className="gap-2">
      <Globe className="h-4 w-4" />
      {locale === 'ar' ? 'English' : 'عربي'}
    </Button>
  );
}
