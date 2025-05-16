// src/app/signup/page.tsx
// This page is no longer functional as authentication has been removed.
// It's kept to avoid breaking imports but should ideally be deleted.

// import { SignupForm } from '@/components/auth/signup-form';
import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sign Up - SimulTradex (Auth Disabled)',
  description: 'Signup functionality is currently disabled.',
};

export default function SignupPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 text-center min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Signup Disabled</h1>
        <p className="text-lg text-muted-foreground mb-6">
          User account creation has been removed from this application.
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </MainLayout>
  );
}
