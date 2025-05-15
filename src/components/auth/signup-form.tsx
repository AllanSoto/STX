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
import { Loader2, AlertTriangle } from 'lucide-react'; // Assuming an icon for Google
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
  const { signup, isFirebaseConfigValid, loginWithGoogle } = useAuth();
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
    if (!isFirebaseConfigValid) {
      toast({
        title: t('firebase.config.errorTitle', 'Firebase Configuration Error'),
        description: t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'),
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await signup(values.email, values.password);
      toast({
        title: t('signup.toast.successTitle', 'Signup Successful'),
        description: t('signup.toast.successDescription', 'Your account has been created. Please log in.'),
      });
      // router.push('/login'); // RootPage will handle redirection after user state updates
    } catch (error: any) {
      // Error handling is inside the signup function in AuthProvider
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignUp = async () => {
    if (!isFirebaseConfigValid) {
      toast({
        title: t('firebase.config.errorTitle', 'Firebase Configuration Error'),
        description: t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'),
        variant: 'destructive',
      });
      return;
    }
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(); // loginWithGoogle handles both signup and login
      toast({
        title: t('signup.toast.successTitle', 'Signup Successful'),
        description: t('signup.toast.successDescription', 'Your account has been created. Please log in.'),
      });
      // router.push('/dashboard'); // RootPage will handle redirection
    } catch (error: any) {
      // Error handling is inside loginWithGoogle -> socialLogin in AuthProvider
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-2xl">
      {!isFirebaseConfigValid && (
        <div className="p-4 mb-6 text-sm text-destructive-foreground bg-destructive rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-bold">{t('firebase.config.errorTitle', 'Firebase Configuration Error')}</p>
            <p>{t('firebase.config.errorMessageSignup', 'Account creation is unavailable...')}</p>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold text-center text-foreground">{t('signup.title', 'Create your SimulTradex Account')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Email, Password, Confirm Password Fields remain the same */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.emailLabel', 'Email Address')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('signup.emailPlaceholder', 'you@example.com')} {...field} disabled={!isFirebaseConfigValid} />
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
                  <Input type="password" placeholder="••••••••" {...field} disabled={!isFirebaseConfigValid} />
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
                  <Input type="password" placeholder="••••••••" {...field} disabled={!isFirebaseConfigValid} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !isFirebaseConfigValid}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {isFirebaseConfigValid ? t('signup.submitButton', 'Sign Up') : t('signup.submitButton', 'Sign Up (disabled)')}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {t('signup.orContinueWith', 'Or continue with')}
          </span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleGoogleSignUp} 
        disabled={isGoogleLoading || !isFirebaseConfigValid}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
           <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.06-6.06C12.836,6.886,13.539,6.301,14.311,5.814l-5.657,5.657C7.354,11.933,6.641,13.244,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l0.001-0.001l6.19,5.238C39.308,34.463,44,27.914,44,20C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
        )}
        {t('signup.signUpWithGoogleButton', 'Sign up with Google')}
      </Button>

      <div className="text-sm text-center text-muted-foreground">
        {t('signup.existingAccountPrompt', 'Already have an account?')}
        <Link href="/login" className={`font-medium text-primary hover:underline ${!isFirebaseConfigValid ? 'opacity-50 pointer-events-none' : ''}`}>
          {t('signup.loginLink', 'Log in')}
        </Link>
      </div>
    </div>
  );
}
