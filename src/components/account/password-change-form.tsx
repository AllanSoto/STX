
'use client';

// This component is largely non-functional as authentication has been removed.
// Kept to avoid breaking imports but should ideally be deleted or heavily refactored.

import { useMemo } from 'react';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm } from 'react-hook-form';
// import * as z from 'zod';
// import { Button } from '@/components/ui/button';
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Loader2 } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
// import { useAuth } from '@/hooks/use-auth'; // Auth is disabled

// Zod schema is commented out as the form is disabled
/*
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
*/

export function PasswordChangeForm() {
  // const [isLoading, setIsLoading] = useState(false); // Form disabled
  // const { toast } = useToast(); // Form disabled
  const { translations, language } = useLanguage();
  // const { updateUserPassword, user } = useAuth(); // Auth disabled
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  // const passwordChangeSchema = useMemo(() => getPasswordChangeSchema(t), [language, t]); // Form disabled

  // const form = useForm<PasswordChangeFormValues>({ // Form disabled
  //   resolver: zodResolver(passwordChangeSchema),
  //   defaultValues: {
  //     currentPassword: '',
  //     newPassword: '',
  //     confirmNewPassword: '',
  //   },
  // });

  // async function onSubmit(values: PasswordChangeFormValues) { // Form disabled
  //   // ... existing logic commented out ...
  // }
  
  return (
     <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('account.passwordChange.title', 'Change Password')}</CardTitle>
        <CardDescription>{t('auth.disabled.featureUnavailableShort', 'Password change disabled.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {t('auth.disabled.passwordChangeMessage', 'Password change functionality is disabled as user authentication has been removed.')}
        </p>
      </CardContent>
    </Card>
  );
}
