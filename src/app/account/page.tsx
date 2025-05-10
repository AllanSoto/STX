
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ApiKeyForm } from '@/components/account/api-key-form';
import { PasswordChangeForm } from '@/components/account/password-change-form';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';

export default function AccountPage() {
  const { user } = useAuth();
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('account.page.title', 'Account Settings')}</h1>
        
        {user && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle>{t('account.page.userInfoTitle', 'User Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>{t('account.page.emailLabel', 'Email:')}</strong> {user.email}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          <ApiKeyForm />
          <PasswordChangeForm />
        </div>
      </div>
    </MainLayout>
  );
}

    