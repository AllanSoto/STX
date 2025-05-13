
'use client';

import Link from 'next/link';
import { BarChartBig, UserCircle, LogOut, LogIn, UserPlus } from 'lucide-react'; 
import { APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; 
import { SidebarTrigger } from '@/components/ui/sidebar'; 
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { translations } = useLanguage();
  const { user, logout, loading: authLoading } = useAuth(); 
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    // router.push('/login'); // AuthProvider already handles this
  };

  const getInitials = (email: string | null | undefined, displayName?: string | null | undefined) => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

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
          {!authLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {/* Placeholder for user avatar image if available */}
                      {/* <AvatarImage src="/avatars/01.png" alt="@shadcn" /> */}
                      <AvatarFallback>{getInitials(user.email, user.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email || t('header.userMenu.anonymous', 'User')}</p>
                      {user.displayName && user.email && <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/account')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>{t('header.userMenu.account', 'Account')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('header.userMenu.logout', 'Log out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
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
        </div>
      </div>
    </header>
  );
}
