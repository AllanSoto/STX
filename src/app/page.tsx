// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function RootPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent multiple redirect attempts if the effect runs rapidly
    if (isRedirecting) {
      return;
    }

    console.log('[RootPage] Auth State:', { authLoading, user });
    if (!authLoading) { // Only redirect once auth state is resolved
      setIsRedirecting(true); // Set flag before redirecting
      if (user) { // Check if user object exists (implies logged in)
        console.log('[RootPage] User is logged in. Redirecting to /dashboard');
        router.replace('/dashboard');
      } else {
        console.log('[RootPage] No user, redirecting to /login');
        router.replace('/login');
      }
    } else {
      console.log('[RootPage] Auth is still loading...');
    }
  }, [router, user, authLoading, isRedirecting]); // Added isRedirecting to dependencies

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
