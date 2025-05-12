
'use client';

import Link from 'next/link';
import { BarChartBig } from 'lucide-react'; 
import { APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { SidebarTrigger } from '@/components/ui/sidebar'; 

export function AppHeader() {
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
          <SidebarTrigger className="mr-2 h-7 w-7" /> 
          <Link href="/dashboard" className="flex items-center space-x-2">
            <BarChartBig className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">{t('app.name', DEFAULT_APP_NAME)}</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* User-specific actions can be placed here if any non-auth related ones are needed */}
        </div>
      </div>
    </header>
  );
}
