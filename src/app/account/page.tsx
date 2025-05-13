
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { PasswordChangeForm } from '@/components/account/password-change-form';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function AccountPage() {
  const { translations } = useLanguage();
  const { user, loading: authLoading } = useAuth(); 
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  if (authLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
       <MainLayout>
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-3xl font-bold mb-8 text-foreground">{t('account.page.title', 'Account Settings')}</h1>
          <p className="text-lg text-muted-foreground mb-6">{t('account.page.loginPrompt', 'Please log in to view your account settings.')}</p>
          <Button asChild>
            <Link href="/login">{t('login.title', 'Login')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }


  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('account.page.title', 'Account Settings')}</h1>
        
        <div className="grid gap-8 md:grid-cols-2"> 
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>{t('account.profile.title', 'Profile Information')}</CardTitle>
              <CardDescription>{t('account.profile.description', 'Your account details.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('account.profile.emailLabel', 'Email Address')}</p>
                <p className="text-lg">{user.email || t('account.profile.notAvailable', 'Not available')}</p>
              </div>
               {user.displayName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('account.profile.displayNameLabel', 'Display Name')}</p>
                  <p className="text-lg">{user.displayName}</p>
                </div>
              )}
              {/* Add more user details here if needed */}
            </CardContent>
          </Card>

          <PasswordChangeForm />
        </div>
        
      </div>
    </MainLayout>
  );
}

