// src/app/signup/page.tsx
import { SignupForm } from '@/components/auth/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - SimulTradex',
  description: 'Create a new SimulTradex account.',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <SignupForm />
    </div>
  );
}
