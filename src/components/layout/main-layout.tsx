
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from './app-header';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { BarChartBig, History, LayoutDashboard, Languages as LanguagesIcon, ChevronDown, Copyright, Settings, Check } from 'lucide-react';
import { LANGUAGES, APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import type { LanguageCode } from '@/providers/language-provider';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language: currentLanguage, setLanguage, translations, hydrated } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  const [currentYearValue, setCurrentYearValue] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYearValue(new Date().getFullYear());
  }, []);

  const t = (key: string, fallback?: string) => {
    // Ensure fallback is used if not hydrated or translation missing
    if (!hydrated) return fallback || key;
    return translations[key] || fallback || key;
  };

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as LanguageCode);
    setIsLanguageMenuOpen(false);
  };

  const footerContent = currentYearValue ? (
    <>
      <div className="mt-4 p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        <p>&copy; {currentYearValue} {t('app.name', DEFAULT_APP_NAME)}.</p>
        <p>{t('footer.createdBy', 'Created with AI by Allan Soto')}</p>
      </div>
      <div className="hidden p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Copyright className="h-5 w-5 mx-auto" />
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <p>&copy; {currentYearValue} {t('app.name', DEFAULT_APP_NAME)}.</p>
              <p>{t('footer.createdBy', 'Created with AI by Allan Soto')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  ) : null;

  return (
    <TooltipProvider>
    <SidebarProvider defaultOpen={false}>
      <Sidebar side="left" collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-2">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <BarChartBig className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              {t('app.name', DEFAULT_APP_NAME)}
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/dashboard'}
                tooltip={{content: t('dashboard.title', 'Dashboard'), side: 'right', align: 'center' }}
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('dashboard.title', 'Dashboard')}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/account'}
                tooltip={{ content: t('settings.accountSettings', 'Account Settings'), side: 'right', align: 'center' }}
              >
                <Link href="/account">
                  <Settings className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('settings.accountSettings', 'Account Settings')}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/history'}
                tooltip={{content: t('history.menuItem', 'Order History'), side: 'right', align: 'center' }}
              >
                <Link href="/history">
                  <History className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t('history.menuItem', 'Order History')}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator className="my-4" />

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="justify-between"
              aria-expanded={isLanguageMenuOpen}
              tooltip={{content: t('settings.language', 'Language'), side: 'right', align: 'center' }}
            >
              <div className="flex items-center">
                <LanguagesIcon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden ml-2">
                  {t('settings.language', 'Language')}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden',
                  isLanguageMenuOpen ? 'rotate-180' : ''
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isLanguageMenuOpen && (
            <SidebarMenu className="pl-7 pr-2 py-1 group-data-[collapsible=icon]:hidden">
              {LANGUAGES.map((lang) => (
                <SidebarMenuItem key={lang.code}>
                  <SidebarMenuButton
                    onClick={() => handleLanguageChange(lang.code)}
                    isActive={currentLanguage === lang.code}
                    size="sm"
                    className="justify-between w-full"
                  >
                    <span>{lang.name}</span>
                    {currentLanguage === lang.code && (
                      <Check className="h-4 w-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}
        </SidebarContent>

        <SidebarFooter className="p-2 border-t mt-auto">
          {footerContent}
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1 transition-all duration-200 ease-linear md:ml-[var(--sidebar-width-icon)] peer-data-[state=expanded]:md:ml-[var(--sidebar-width)]">
        <AppHeader />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
