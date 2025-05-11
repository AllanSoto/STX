
'use client';

import Link from 'next/link';
import { Languages, LogOut, UserCircle, Settings, BarChartBig, Check, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGES, APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import type { LanguageCode } from '@/providers/language-provider';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { user, logout } = useAuth();
  const { language, setLanguage, translations } = useLanguage();
  const router = useRouter();

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as LanguageCode);
  };

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <BarChartBig className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">{t('app.name', DEFAULT_APP_NAME)}</span>
        </Link>
        
        <nav className="flex flex-1 items-center space-x-4 sm:justify-end">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">{t('settings.title', 'Settings')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('settings.myAccount', 'My Account')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>{t('settings.accountSettings', 'Account Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/history')}>
                  <History className="mr-2 h-4 w-4" />
                  <span>{t('history.menuItem', 'Order History')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('settings.language', 'Language')}</DropdownMenuLabel>
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)} aria-selected={language === lang.code}>
                    {lang.name}
                    {language === lang.code && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('settings.logout', 'Log out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
