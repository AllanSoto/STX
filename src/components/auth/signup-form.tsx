// src/components/auth/signup-form.tsx
'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const getSignupFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  email: z.string().email({ message: t('zod.email.invalid', 'Invalid email address.') }),
  password: z.string()
    .min(8, { message: t('zod.password.minLength', 'Password must be at least 8 characters.') })
    .regex(/[a-z]/, { message: t('zod.password.lowercase', 'Password must contain at least one lowercase letter.') })
    .regex(/[A-Z]/, { message: t('zod.password.uppercase', 'Password must contain at least one uppercase letter.') })
    .regex(/[0-9]/, { message: t('zod.password.number', 'Password must contain at least one number.') })
    .regex(/[^a-zA-Z0-9]/, { message: t('zod.password.specialChar', 'Password must contain at least one special character.') }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t('zod.password.confirmMatch', "Passwords don't match."),
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<ReturnType<typeof getSignupFormSchema>>;

export function SignupForm() {
  const { signup } = useAuth();
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;
  const signupFormSchema = useMemo(() => getSignupFormSchema(t), [language, t]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      await signup(values.email, values.password);
      toast({
        title: t('signup.toast.successTitle', 'Signup Successful'),
        description: t('signup.toast.successDescription', 'Your account has been created. Please log in.'),
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        title: t('signup.toast.errorTitle', 'Signup Failed'),
        description: error.message || t('signup.toast.errorDescription', 'Could not create account. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
      <h1 className="text-3xl font-bold text-center text-foreground">{t('signup.title', 'Create your SimulTradex Account')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.emailLabel', 'Email Address')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('signup.emailPlaceholder', 'you@example.com')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.passwordLabel', 'Password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.confirmPasswordLabel', 'Confirm Password')}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('signup.submitButton', 'Sign Up')}
          </Button>
        </form>
      </Form>
      <div className="text-sm text-center text-muted-foreground">
        {t('signup.existingAccountPrompt', 'Already have an account?')}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('signup.loginLink', 'Log in')}
        </Link>
      </div>
    </div>
  );
}
