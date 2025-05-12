
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from './app-header';
import { Skeleton } from "@/components/ui/skeleton";
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
import { BarChartBig, Settings, History, Wallet, LogOut, Check, LayoutDashboard, Languages as LanguagesIcon, ChevronDown, Copyright } from 'lucide-react';
import { LANGUAGES, APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import type { LanguageCode } from '@/providers/language-provider';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { language: currentLanguage, setLanguage, translations } = useLanguage();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as LanguageCode);
    setIsLanguageMenuOpen(false); // Close menu after selection
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <Link href="/" className="flex items-center space-x-2">
              <BarChartBig className="h-6 w-6 text-primary" />
              <span className="font-bold sm:inline-block">{t('app.name', DEFAULT_APP_NAME)}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 container mx-auto py-8 px-4">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <SidebarProvider defaultOpen={false}>
      <Sidebar side="left" collapsible="icon" variant="sidebar" className="border-r">
        <SidebarHeader className="p-2">
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-2">
            <BarChartBig className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">{t('app.name', DEFAULT_APP_NAME)}</span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={pathname === '/dashboard'} 
                tooltip={{content: t('dashboard.title'), side: 'right', align: 'center' }}
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('dashboard.title')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={pathname === '/account'} 
                tooltip={{content: t('settings.accountSettings'), side: 'right', align: 'center' }}
              >
                <Link href="/account">
                  <Settings className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('settings.accountSettings')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={pathname === '/history'} 
                tooltip={{content: t('history.menuItem'), side: 'right', align: 'center' }}
              >
                <Link href="/history">
                  <History className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('history.menuItem')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                isActive={pathname === '/balance'} 
                tooltip={{content: t('balance.menuItem'), side: 'right', align: 'center' }}
              >
                <Link href="/balance">
                  <Wallet className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('balance.menuItem')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <SidebarSeparator className="my-4" />
          
          {/* Language Selection Collapsible Menu */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              className="justify-between"
              aria-expanded={isLanguageMenuOpen}
              tooltip={{content: t('settings.language'), side: 'right', align: 'center' }}
            >
              <div className="flex items-center">
                <LanguagesIcon className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden ml-2">{t('settings.language')}</span>
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

        <SidebarFooter className="p-2 border-t mt-auto"> {/* mt-auto pushes footer to bottom */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={logout}
                tooltip={{content: t('settings.logout'), side: 'right', align: 'center' }}
              >
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('settings.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="mt-4 p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <p>&copy; {currentYear} {t('app.name', DEFAULT_APP_NAME)}.</p>
            <p>{t('footer.createdBy', 'Creado con IA por Allan Soto')}</p>
          </div>
          <div className="hidden p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Copyright className="h-5 w-5 mx-auto" />
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center">
                        <p>&copy; {currentYear} {t('app.name', DEFAULT_APP_NAME)}.</p>
                        <p>{t('footer.createdBy', 'Creado con IA por Allan Soto')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-col flex-1 transition-all duration-200 ease-linear md:ml-[var(--sidebar-width-icon)] peer-data-[state=expanded]:md:ml-[var(--sidebar-width)]">
        <AppHeader />
        <main className="flex-1"> {/* Removed default padding, pages will handle their own padding */}
          {children}
        </main>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
