
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

const getPasswordChangeSchema = (t: (key: string, fallback?: string) => string) => z.object({
  currentPassword: z.string().min(1, { message: t('zod.password.currentRequired', 'Current password is required.') }),
  newPassword: z.string().min(8, { message: t('zod.password.newMinLength', 'Password must be at least 8 characters.') })
    .regex(/[a-z]/, { message: t('zod.password.newLowercase', 'Password must contain at least one lowercase letter.') })
    .regex(/[A-Z]/, { message: t('zod.password.newUppercase', 'Password must contain at least one uppercase letter.') })
    .regex(/[0-9]/, { message: t('zod.password.newNumber', 'Password must contain at least one number.') })
    .regex(/[^a-zA-Z0-9]/, { message: t('zod.password.newSpecialChar', 'Password must contain at least one special character.') }),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: t('zod.password.newConfirmMatch', "New passwords don't match"),
  path: ["confirmNewPassword"],
});

type PasswordChangeFormValues = z.infer<ReturnType<typeof getPasswordChangeSchema>>;

export function PasswordChangeForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { translations, language } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const passwordChangeSchema = useMemo(() => getPasswordChangeSchema(t), [language, t]);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  async function onSubmit(values: PasswordChangeFormValues) {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Password change submitted (mock):', values);
    
    if (values.currentPassword === "oldpassword") { 
        toast({
            title: t('account.passwordChange.toast.changedTitle', "Password Changed"),
            description: t('account.passwordChange.toast.changedDescription', "Your password has been successfully updated."),
        });
        form.reset();
    } else {
        toast({
            title: t('account.passwordChange.toast.failedTitle', "Password Change Failed"),
            description: t('account.passwordChange.toast.failedDescriptionIncorrect', "Incorrect current password."),
            variant: "destructive",
        });
        form.setError("currentPassword", { type: "manual", message: t('account.passwordChange.toast.failedDescriptionIncorrect', "Incorrect current password.") });
    }
    
    setIsLoading(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('account.passwordChange.title', 'Change Password')}</CardTitle>
        <CardDescription>{t('account.passwordChange.description', 'Update your account password.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.passwordChange.currentPasswordLabel', 'Current Password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('account.passwordChange.passwordPlaceholder', '••••••••')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.passwordChange.newPasswordLabel', 'New Password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('account.passwordChange.passwordPlaceholder', '••••••••')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.passwordChange.confirmNewPasswordLabel', 'Confirm New Password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('account.passwordChange.passwordPlaceholder', '••••••••')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('account.passwordChange.submitButton', 'Change Password')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    