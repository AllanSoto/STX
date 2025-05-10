
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';

const getApiKeyFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  apiKey: z.string().min(10, { message: t('zod.apiKey.short', 'API Key seems too short.') }),
  apiSecret: z.string().min(10, { message: t('zod.apiSecret.short', 'API Secret seems too short.') }),
});

type ApiKeyFormValues = z.infer<ReturnType<typeof getApiKeyFormSchema>>;

export function ApiKeyForm() {
  const { user, updateApiKey, isConnectedToBinance } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { translations, language } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const apiKeyFormSchema = useMemo(() => getApiKeyFormSchema(t), [language, t]);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      apiKey: user?.binanceApiKey || '',
      apiSecret: '', 
    },
  });
  
  useEffect(() => {
    if (user?.binanceApiKey) {
      form.reset({ apiKey: user.binanceApiKey, apiSecret: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.binanceApiKey, form.reset]);


  async function onSubmit(values: ApiKeyFormValues) {
    setIsConnecting(true);
    setConnectionError(null);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (values.apiKey === 'test_key_invalid') {
      setConnectionError(t('account.apiKey.error.connectionFailed', 'Connection failed: Invalid API Key or Secret.'));
      updateApiKey('', ''); 
      toast({ 
        title: t('account.apiKey.toast.connectionFailedTitle', "API Connection Failed"), 
        description: t('account.apiKey.toast.connectionFailedDescription', "Invalid API Key or Secret."), 
        variant: "destructive" 
      });
    } else {
      updateApiKey(values.apiKey, values.apiSecret);
      toast({ 
        title: t('account.apiKey.toast.connectedTitle', "API Connected"), 
        description: t('account.apiKey.toast.connectedDescription', "Successfully connected to Binance API.") 
      });
      form.reset({ ...values, apiSecret: '' }); 
    }
    setIsConnecting(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('account.apiKey.title', 'Binance API Connection')}</CardTitle>
        <CardDescription>{t('account.apiKey.description', 'Connect your Binance account to fetch real-time data. Your keys are stored locally (mock).')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnectedToBinance ? (
          <div className="flex items-center space-x-2 p-4 rounded-md bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
            <p>{t('account.apiKey.connectedStatus', 'Connected to Binance API.')}</p>
            <Button variant="outline" size="sm" onClick={() => updateApiKey('', '')} className="ml-auto">
                {t('account.apiKey.disconnectButton', 'Disconnect')}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('account.apiKey.apiKeyLabel', 'API Key')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('account.apiKey.apiKeyPlaceholder', 'Your Binance API Key')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('account.apiKey.apiSecretLabel', 'API Secret')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('account.apiKey.apiSecretPlaceholder', 'Your Binance API Secret')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {connectionError && (
                <div className="flex items-center space-x-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">{connectionError}</p>
                </div>
              )}
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isConnecting}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('account.apiKey.connectButton', 'Connect to Binance')}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

    