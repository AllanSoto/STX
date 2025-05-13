// src/app/login/page.tsx
import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - SimulTradex',
  description: 'Log in to your SimulTradex account.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
