
'use client';

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
import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME as DEFAULT_APP_NAME } from '@/lib/constants';
import { useLanguage } from '@/hooks/use-language';

const getLoginFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  email: z.string().email({ message: t('zod.email.invalid', 'Invalid email address.') }),
  password: z.string().min(8, { message: t('zod.password.minLength', 'Password must be at least 8 characters.') })
    .regex(/[a-z]/, { message: t('zod.password.lowercase', 'Password must contain at least one lowercase letter.') })
    .regex(/[A-Z]/, { message: t('zod.password.uppercase', 'Password must contain at least one uppercase letter.') })
    .regex(/[0-9]/, { message: t('zod.password.number', 'Password must contain at least one number.') })
    .regex(/[^a-zA-Z0-9]/, { message: t('zod.password.specialChar', 'Password must contain at least one special character.') }),
});

type LoginFormValues = z.infer<ReturnType<typeof getLoginFormSchema>>;

export function LoginForm() {
  const { login } = useAuth();
  const { translations, language } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginFormSchema = useMemo(() => getLoginFormSchema(t), [language, t]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      // Redirect is handled by AuthProvider or RootPage effect
    } catch (err) {
       if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('login.error.unknown', 'An unknown error occurred.'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-primary">{t('app.name', DEFAULT_APP_NAME)}</CardTitle>
        <CardDescription>{t('login.description', 'Log in to your account')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.emailLabel', 'Email')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('login.emailPlaceholder', 'you@example.com')} {...field} />
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
                  <FormLabel>{t('login.passwordLabel', 'Password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.submitButton', 'Log In')}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('login.signupPrompt', "Don't have an account?")}{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t('login.signupLink', 'Sign up')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
