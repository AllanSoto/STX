'use client';

import Link from 'next/link';
import { Languages, LogOut, UserCircle, Settings, BarChartBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { APP_NAME, LANGUAGES } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLanguageChange = (langCode: string) => {
    console.log(`Language selected: ${langCode}`);
    // Add actual language change logic here if implemented
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
          <BarChartBig className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">{APP_NAME}</span>
        </Link>
        
        <nav className="flex flex-1 items-center space-x-4 sm:justify-end">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)}>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
