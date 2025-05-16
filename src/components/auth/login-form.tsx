// src/components/auth/login-form.tsx
// This component is no longer functional as authentication has been removed.
// It's kept to avoid breaking imports but should ideally be deleted.

'use client';

import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const { translations, languageHydrated } = useLanguage();
  const t = (key: string, fallback?: string) => {
    if (!languageHydrated) return fallback || key;
    return translations[key] || fallback || key;
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
      <h1 className="text-3xl font-bold text-center text-foreground">
        {t('login.title', 'Login to SimulTradex')} (Disabled)
      </h1>
      <p className="text-center text-muted-foreground">
        {t('auth.disabled.featureUnavailable', 'Login functionality is currently disabled because user authentication has been removed from the application.')}
      </p>
      <Button asChild className="w-full">
        <Link href="/dashboard">{t('auth.disabled.goToDashboard', 'Go to Dashboard')}</Link>
      </Button>
       <div className="text-sm text-center text-muted-foreground">
        {t('login.noAccountPrompt', "Don't have an account?")}{' '}
        <span className="font-medium text-primary opacity-50">
          {t('login.signUpLink', 'Sign up (Disabled)')}
        </span>
      </div>
    </div>
  );
}
