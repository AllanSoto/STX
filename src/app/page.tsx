
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth

export default function RootPage() {
  const router = useRouter();
  const { translations } = useLanguage();
  const { user, loading: authLoading } = useAuth(); // Get user and loading state
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  useEffect(() => {
    console.log('[RootPage] Auth State:', { authLoading, userEmail: user?.email }); // Debug log
    if (!authLoading) { // Only redirect once auth state is resolved
      if (user) {
        console.log('[RootPage] User found, redirecting to /dashboard');
        router.replace('/dashboard');
      } else {
        console.log('[RootPage] No user, redirecting to /login');
        router.replace('/login');
      }
    } else {
      console.log('[RootPage] Auth still loading...');
    }
  }, [router, user, authLoading]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">
         {authLoading 
          ? t('app.loadingAuth', 'Verifying session...') 
          : t('app.redirecting', 'Redirecting...')}
      </p>
    </div>
  );
}

