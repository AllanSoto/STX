// src/components/auth/login-form.tsx
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const getLoginFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  email: z.string().email({ message: t('zod.email.invalid', 'Invalid email address.') }),
  password: z.string().min(1, { message: t('zod.password.required', 'Password is required.') }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<ReturnType<typeof getLoginFormSchema>>;

export function LoginForm() {
  const { login, sendPasswordResetEmail, isFirebaseConfigValid } = useAuth(); 
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);

  const t = (key: string, fallback?: string) => translations[key] || fallback || key;
  const loginFormSchema = useMemo(() => getLoginFormSchema(t), [language, t]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(values: LoginFormValues) {
    if (!isFirebaseConfigValid) {
      toast({
        title: t('firebase.config.errorTitle', 'Firebase Configuration Error'),
        description: t('firebase.config.errorMessageLogin', 'Login is unavailable because the application is not properly configured to connect to Firebase. Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file. Refer to README.md for setup instructions.'),
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await login(values.email, values.password, values.rememberMe);
      toast({
        title: t('login.toast.successTitle', 'Login Successful'),
        description: t('login.toast.successDescription', 'Welcome back!'),
      });
      router.push('/dashboard');
    } catch (error: any) {
      let description = error.message || t('login.toast.errorDescription', 'Invalid credentials or server error.');
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = t('login.toast.errorDescriptionInvalid', 'Invalid email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        description = t('login.toast.errorDescriptionTooManyRequests', 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.');
      } else if (error.code === 'auth/api-key-not-valid') {
         description = t('firebase.config.apiKeyInvalid'); // Use the translation key directly
      }
      toast({
        title: t('login.toast.errorTitle', 'Login Failed'),
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    if (!isFirebaseConfigValid) {
      toast({
        title: t('firebase.config.errorTitle', 'Firebase Configuration Error'),
        description: t('firebase.config.errorMessage', 'Cannot send password reset. Firebase is not configured.'),
        variant: 'destructive',
      });
      return;
    }
    if (!forgotPasswordEmail) {
      toast({
        title: t('login.forgotPassword.toast.emailRequiredTitle', 'Email Required'),
        description: t('login.forgotPassword.toast.emailRequiredDescription', 'Please enter your email to reset password.'),
        variant: 'warning',
      });
      return;
    }
    setIsPasswordResetLoading(true);
    try {
      await sendPasswordResetEmail(forgotPasswordEmail);
      toast({
        title: t('login.forgotPassword.toast.emailSentTitle', 'Password Reset Email Sent'),
        description: t('login.forgotPassword.toast.emailSentDescription', 'Check your inbox for password reset instructions.'),
      });
    } catch (error: any) {
      toast({
        title: t('login.forgotPassword.toast.emailErrorTitle', 'Error Sending Email'),
        description: error.message || t('login.forgotPassword.toast.emailErrorDescription', 'Could not send password reset email.'),
        variant: 'destructive',
      });
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
      {!isFirebaseConfigValid && (
        <div className="p-4 mb-6 text-sm text-destructive-foreground bg-destructive rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-bold">{t('firebase.config.errorTitle', 'Firebase Configuration Error')}</p>
            <p>{t('firebase.config.errorMessageLogin', 'Login is unavailable because the application is not properly configured to connect to Firebase. Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file. Refer to README.md for setup instructions.')}</p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold text-center text-foreground">{t('login.title', 'Login to SimulTradex')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.emailLabel', 'Email Address')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('login.emailPlaceholder', 'you@example.com')} {...field} disabled={!isFirebaseConfigValid} />
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
                  <Input type="password" placeholder="••••••••" {...field} disabled={!isFirebaseConfigValid} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!isFirebaseConfigValid}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  {t('login.rememberMeLabel', 'Remember me')}
                </FormLabel>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !isFirebaseConfigValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login.submitButton', 'Log In')}
          </Button>
        </form>
      </Form>
      <div className="text-sm text-center text-muted-foreground">
        <p>
          {t('login.forgotPasswordPrompt', 'Forgot your password?')}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="email"
            placeholder={t('login.emailPlaceholder', 'you@example.com')}
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            className="flex-grow"
            disabled={!isFirebaseConfigValid}
          />
          <Button
            type="button"
            variant="link"
            onClick={handleForgotPassword}
            disabled={isPasswordResetLoading || !isFirebaseConfigValid}
            className="p-0 h-auto"
          >
            {isPasswordResetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('login.forgotPassword.sendResetLinkButton', 'Send Reset Link')}
          </Button>
        </div>
      </div>
      <div className="text-sm text-center text-muted-foreground">
        {t('login.noAccountPrompt', "Don't have an account?")}{' '}
        <Link href="/signup" className={`font-medium text-primary hover:underline ${!isFirebaseConfigValid ? 'opacity-50 pointer-events-none' : ''}`}>
          {t('login.signUpLink', 'Sign up')}
        </Link>
      </div>
    </div>
  );
}
