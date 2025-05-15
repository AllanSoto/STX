// src/components/auth/login-form.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Loader2, AlertTriangle } from 'lucide-react'; // Assuming an icon for Google
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const getLoginFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  email: z.string().email({ message: t('zod.email.invalid', 'Invalid email address.') }),
  password: z.string().min(1, { message: t('zod.password.required', 'Password is required.') }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<ReturnType<typeof getLoginFormSchema>>;

export function LoginForm() {
  const { login, sendPasswordResetEmail, isFirebaseConfigValid, loginWithGoogle } = useAuth();
  const { translations, language, hydrated: languageHydrated } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');

  const t = (key: string, fallback?: string) => {
    if (!languageHydrated) return fallback || key;
    return translations[key] || fallback || key;
  };
  
  useEffect(() => {
    if (languageHydrated) {
      setDisplayTitle(t('login.title', 'Login to SimulTradex'));
    }
  }, [languageHydrated, t]);

  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);

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
        description: t('firebase.config.errorMessageLogin', 'Login is unavailable...'),
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
      // router.push('/dashboard'); // RootPage will handle this
    } catch (error: any) {
      // Error handling is inside the login function in AuthProvider
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigValid) {
      toast({
        title: t('firebase.config.errorTitle', 'Firebase Configuration Error'),
        description: t('firebase.config.errorMessageLogin', 'Login is unavailable...'),
        variant: 'destructive',
      });
      return;
    }
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast({
        title: t('login.toast.successTitle', 'Login Successful'),
        description: t('login.toast.successDescription', 'Welcome back!'),
      });
      // router.push('/dashboard'); // RootPage will handle this
    } catch (error: any) {
      // Error handling is inside loginWithGoogle -> socialLogin in AuthProvider
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // ... (existing forgot password logic remains the same)
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
            <p>{t('firebase.config.errorMessageLogin', 'Login is unavailable...')}</p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold text-center text-foreground">{displayTitle || t('login.title', 'Login to SimulTradex')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Email and Password Fields remain the same */}
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
                    onCheckedChange={(checked) => {
                      setTimeout(() => {
                        field.onChange(checked);
                      }, 0);
                    }}
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
             {isFirebaseConfigValid ? t('login.submitButton', 'Log In') : t('login.submitButton', 'Log In (disabled)')}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {t('login.orContinueWith', 'Or continue with')}
          </span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignIn} 
        disabled={isGoogleLoading || !isFirebaseConfigValid}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          // Replace with Google icon if available, e.g. <GoogleIcon className="mr-2 h-4 w-4" />
          <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.06-6.06C12.836,6.886,13.539,6.301,14.311,5.814l-5.657,5.657C7.354,11.933,6.641,13.244,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.001-0.001l6.19,5.238C39.308,34.463,44,27.914,44,20C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
        )}
        {t('login.signInWithGoogleButton', 'Sign in with Google')}
      </Button>

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
