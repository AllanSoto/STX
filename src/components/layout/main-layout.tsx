
'use client';

import React, { useEffect } from 'react';
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
  SidebarGroup,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import { BarChartBig, Settings, History, Wallet, LogOut, Check, LayoutDashboard, Languages as LanguagesIcon } from 'lucide-react';
import { LANGUAGES, APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import type { LanguageCode } from '@/providers/language-provider';
import Link from 'next/link';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { language: currentLanguage, setLanguage, translations } = useLanguage();

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as LanguageCode);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Render a minimal AppHeader or a simplified one for loading/logged-out state */}
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
    <SidebarProvider defaultOpen={true}> {/* Sidebar can be open by default on desktop */}
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
                isActive={pathname === '/dashboard'} 
                onClick={() => router.push('/dashboard')} 
                tooltip={{content: t('dashboard.title'), side: 'right', align: 'center' }}
              >
                <LayoutDashboard className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('dashboard.title')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === '/account'} 
                onClick={() => router.push('/account')} 
                tooltip={{content: t('settings.accountSettings'), side: 'right', align: 'center' }}
              >
                <Settings className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('settings.accountSettings')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === '/history'} 
                onClick={() => router.push('/history')} 
                tooltip={{content: t('history.menuItem'), side: 'right', align: 'center' }}
              >
                <History className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('history.menuItem')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={pathname === '/balance'} 
                onClick={() => router.push('/balance')} 
                tooltip={{content: t('balance.menuItem'), side: 'right', align: 'center' }}
              >
                <Wallet className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">{t('balance.menuItem')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <SidebarSeparator className="my-4" />
          
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0.5">
              <LanguagesIcon className="h-5 w-5 mr-2 group-data-[collapsible=icon]:mr-0" />
              <span className="group-data-[collapsible=icon]:hidden">{t('settings.language')}</span>
            </SidebarGroupLabel>
            <SidebarMenu>
              {LANGUAGES.map((lang) => (
                <SidebarMenuItem key={lang.code}>
                  <SidebarMenuButton 
                    onClick={() => handleLanguageChange(lang.code)} 
                    isActive={currentLanguage === lang.code}
                    tooltip={{content: lang.name, side: 'right', align: 'center' }}
                  >
                    {/* For collapsed state, an icon or first 2 letters could be shown, but tooltip is primary */}
                    {/* <span className="w-5 h-5 flex items-center justify-center group-data-[collapsible=icon]:block hidden">{lang.code.toUpperCase()}</span> */}
                    <span className="group-data-[collapsible=icon]:hidden">{lang.name}</span>
                    {currentLanguage === lang.code && <Check className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t">
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
        </SidebarFooter>
      </Sidebar>

      {/* Main content area that adjusts its margin based on sidebar state */}
      <div className="flex flex-col flex-1 transition-all duration-200 ease-linear md:ml-[var(--sidebar-width-icon)] peer-data-[state=expanded]:md:ml-[var(--sidebar-width)]">
        <AppHeader />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
