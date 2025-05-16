// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
// useAuth is no longer needed here as we redirect unconditionally
// import { useAuth } from '@/hooks/use-auth';
// import { useLanguage } from '@/hooks/use-language';

export default function RootPage() {
  const router = useRouter();
  // const { user, loading: authLoading } = useAuth(); // No longer needed
  // const { translations } = useLanguage(); // No longer needed for t function here
  // const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  useEffect(() => {
    // Since authentication is removed, directly redirect to the dashboard.
    console.log('[RootPage] No authentication. Redirecting to /dashboard');
    router.replace('/dashboard');
  }, [router]); // Only router is a dependency now

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" /> 
      {/* Removed conditional text as redirection is immediate */}
    </div>
  );
}
