
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { PasswordChangeForm } from '@/components/account/password-change-form';
import { useLanguage } from '@/hooks/use-language';

export default function AccountPage() {
  const { translations } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-foreground">{t('account.page.title', 'Account Settings')}</h1>
        
        <div className="grid gap-8 md:grid-cols-1"> 
          {/* PasswordChangeForm might be less relevant without distinct user accounts, 
              but keeping it for now as a generic settings example. 
              In a real app, this would likely be removed or re-purposed. */}
          <PasswordChangeForm />
        </div>
        
        {/* ActiveAlertsList and ApiKeyForm removed as they are user-specific */}
      </div>
    </MainLayout>
  );
}
