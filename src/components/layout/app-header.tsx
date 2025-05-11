
'use client';

import Link from 'next/link';
import { BarChartBig, PanelLeft } from 'lucide-react'; // PanelLeft for SidebarTrigger
import { Button } from '@/components/ui/button';
import { APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { SidebarTrigger } from '@/components/ui/sidebar'; // Import SidebarTrigger

export function AppHeader() {
  const { user } = useAuth();
  const { translations } = useLanguage();

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
          {user && (
            <SidebarTrigger className="mr-2 h-7 w-7 md:hidden" /> // Show trigger on mobile
          )}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <BarChartBig className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">{t('app.name', DEFAULT_APP_NAME)}</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* User-specific actions like profile icon or settings icon can go here if needed, */}
          {/* but primary navigation including user actions is now in the sidebar. */}
        </div>
      </div>
    </header>
  );
}
