'use client';

import { useState } from 'react';
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

const apiKeyFormSchema = z.object({
  apiKey: z.string().min(10, { message: 'API Key seems too short.' }),
  apiSecret: z.string().min(10, { message: 'API Secret seems too short.' }),
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export function ApiKeyForm() {
  const { user, updateApiKey, isConnectedToBinance } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      apiKey: user?.binanceApiKey || '',
      apiSecret: '', // Secrets should not be pre-filled for security
    },
  });
  
  // Update form default values if user data changes (e.g. after login)
  useState(() => {
    if (user?.binanceApiKey) {
      form.reset({ apiKey: user.binanceApiKey, apiSecret: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.binanceApiKey]);


  async function onSubmit(values: ApiKeyFormValues) {
    setIsConnecting(true);
    setConnectionError(null);
    // Simulate API connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock connection logic
    if (values.apiKey === 'test_key_invalid') {
      setConnectionError('Connection failed: Invalid API Key or Secret.');
      updateApiKey('', ''); // Clear keys on failure
      toast({ title: "API Connection Failed", description: "Invalid API Key or Secret.", variant: "destructive" });
    } else {
      updateApiKey(values.apiKey, values.apiSecret);
      toast({ title: "API Connected", description: "Successfully connected to Binance API." });
      // Optionally clear secret field after successful submission for security
      form.reset({ ...values, apiSecret: '' }); 
    }
    setIsConnecting(false);
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Binance API Connection</CardTitle>
        <CardDescription>Connect your Binance account to fetch real-time data. Your keys are stored locally (mock).</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnectedToBinance ? (
          <div className="flex items-center space-x-2 p-4 rounded-md bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
            <p>Connected to Binance API.</p>
            <Button variant="outline" size="sm" onClick={() => updateApiKey('', '')} className="ml-auto">
                Disconnect
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
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Binance API Key" {...field} />
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
                    <FormLabel>API Secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Your Binance API Secret" {...field} />
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
                Connect to Binance
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
