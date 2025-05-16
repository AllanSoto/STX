
'use client';

import { MainLayout } from '@/components/layout/main-layout';
// import { PasswordChangeForm } from '@/components/account/password-change-form'; // Removed as auth is disabled
import { useLanguage } from '@/hooks/use-language';
// import { useAuth } from '@/hooks/use-auth'; // Auth is disabled
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
// import { Loader2 } from 'lucide-react'; // Not needed without auth loading

export default function AccountPage() {
  const { translations } = useLanguage();
  // const { user, loading: authLoading } = useAuth(); // Auth disabled
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  // Since auth is removed, this page has limited functionality.
  // We can show a message indicating auth is disabled.

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('account.page.title', 'Account Settings')}</h1>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('account.profile.title', 'Profile Information')}</CardTitle>
            <CardDescription>{t('auth.disabled.featureUnavailableShort', 'Account features disabled.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              {t('auth.disabled.accountPageMessage', 'User account management is disabled as authentication has been removed from this application.')}
            </p>
            <Button asChild>
              <Link href="/dashboard">{t('auth.disabled.goToDashboard', 'Go to Dashboard')}</Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* PasswordChangeForm removed as it requires an authenticated user */}
        {/* 
        <div className="grid gap-8 md:grid-cols-2"> 
          <Card className="shadow-lg"> ... </Card>
          <PasswordChangeForm />
        </div> 
        */}
      </div>
    </MainLayout>
  );
}
