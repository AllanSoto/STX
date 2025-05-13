
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
    if (!authLoading) { // Only redirect once auth state is resolved
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router, user, authLoading]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">{t('app.loadingMessage', 'Loading SimulTradex...')}</p>
    </div>
  );
}

