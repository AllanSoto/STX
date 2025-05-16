
'use client';

import Link from 'next/link';
import { BarChartBig } from 'lucide-react'; 
import { APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
// useAuth and related imports are removed as auth is disabled
// import { useAuth } from '@/hooks/use-auth'; 
// import { UserCircle, LogOut, LogIn, UserPlus } from 'lucide-react'; 
import { SidebarTrigger } from '@/components/ui/sidebar'; 
// import { Button } from '@/components/ui/button';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { translations } = useLanguage();
  // const { user, logout, loading: authLoading } = useAuth(); // Auth removed
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;
  // const router = useRouter(); // Not needed if no auth actions

  // const handleLogout = async () => { // Auth removed
  //   await logout();
  // };

  // const getInitials = (email: string | null | undefined, displayName?: string | null | undefined) => { // Auth removed
  //   if (displayName) {
  //     return displayName.substring(0, 2).toUpperCase();
  //   }
  //   if (email) {
  //     return email.substring(0, 2).toUpperCase();
  //   }
  //   return 'U';
  // }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
          <SidebarTrigger className="mr-2 h-7 w-7 md:hidden" /> {/* Hidden on md and up */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <BarChartBig className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">{t('app.name', DEFAULT_APP_NAME)}</span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Auth-related UI removed */}
          {/* 
          {!authLoading && (
            user ? (
              <DropdownMenu>
                ... user menu ...
              </DropdownMenu>
            ) : (
              <div className="space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('header.loginButton', 'Login')}
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('header.signupButton', 'Sign Up')}
                  </Link>
                </Button>
              </div>
            )
          )}
          */}
        </div>
      </div>
    </header>
  );
}
