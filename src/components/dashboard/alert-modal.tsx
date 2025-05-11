// src/components/dashboard/alert-modal.tsx
'use client';

import { useState, useEffect, useMemo }from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/use-language';
import type { CryptoSymbol, PriceAlert, AlertDirection } from '@/lib/types';
import { savePriceAlert, updatePriceAlert, deletePriceAlert } from '@/lib/firebase/alerts';
import type { PriceAlertData } from '@/lib/firebase/alerts';
import { Loader2, Trash2 } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  cryptoSymbol: CryptoSymbol | null;
  currentPrice: number | null;
  existingAlert?: PriceAlert | null;
  onAlertSaved?: () => void; // Callback after an alert is saved/updated/deleted
}

const getAlertFormSchema = (t: (key: string, fallback?: string) => string) => z.object({
  targetPrice: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: t('zod.alert.targetPricePositive', 'Target price must be a positive number.'),
  }),
  direction: z.enum(['above', 'below'], {
    required_error: t('zod.alert.directionRequired', 'Please select a direction for the alert.'),
  }),
});

type AlertFormValues = z.infer<ReturnType<typeof getAlertFormSchema>>;

export function AlertModal({
  isOpen,
  onClose,
  cryptoSymbol,
  currentPrice,
  existingAlert,
  onAlertSaved,
}: AlertModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { translations, language } = useLanguage();
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;

  const [isProcessing, setIsProcessing] = useState(false);

  const alertFormSchema = useMemo(() => getAlertFormSchema(t), [language, t]);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      targetPrice: existingAlert?.targetPrice.toString() || '',
      direction: existingAlert?.direction || 'above',
    },
  });

  useEffect(() => {
    if (existingAlert) {
      form.reset({
        targetPrice: existingAlert.targetPrice.toString(),
        direction: existingAlert.direction,
      });
    } else if (cryptoSymbol && currentPrice) {
       form.reset({
        targetPrice: currentPrice.toFixed(2), // Default to current price
        direction: 'above',
      });
    } else {
        form.reset({
            targetPrice: '',
            direction: 'above',
        })
    }
  }, [existingAlert, cryptoSymbol, currentPrice, form, isOpen]);

  const handleSubmit = async (values: AlertFormValues) => {
    if (!user || !cryptoSymbol) return;
    setIsProcessing(true);

    const alertData: PriceAlertData = {
      symbol: cryptoSymbol,
      targetPrice: parseFloat(values.targetPrice),
      direction: values.direction as AlertDirection,
    };

    try {
      if (existingAlert) {
        await updatePriceAlert(existingAlert.id, alertData);
        toast({ title: t('alertModal.toast.updatedTitle', 'Alert Updated'), description: t('alertModal.toast.updatedDescription', 'Your price alert for {symbol} has been updated.', { symbol: cryptoSymbol }) });
      } else {
        await savePriceAlert(user.id, alertData);
        toast({ title: t('alertModal.toast.savedTitle', 'Alert Saved'), description: t('alertModal.toast.savedDescription', 'Your price alert for {symbol} has been set.', { symbol: cryptoSymbol }) });
      }
      onAlertSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving alert:', error);
      toast({
        title: t('alertModal.toast.errorTitle', 'Error Saving Alert'),
        description: error instanceof Error ? error.message : t('alertModal.toast.errorDescriptionGeneric', 'Could not save the alert.'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existingAlert) return;
    setIsProcessing(true);
    try {
      await deletePriceAlert(existingAlert.id);
      toast({ title: t('alertModal.toast.deletedTitle', 'Alert Deleted'), description: t('alertModal.toast.deletedDescription', 'The price alert for {symbol} has been deleted.', { symbol: existingAlert.symbol }) });
      onAlertSaved?.();
      onClose();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: t('alertModal.toast.errorDeleteTitle', 'Error Deleting Alert'),
        description: error instanceof Error ? error.message : t('alertModal.toast.errorDescriptionGenericDelete', 'Could not delete the alert.'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!cryptoSymbol) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {existingAlert 
              ? t('alertModal.title.edit', 'Edit Alert for {symbol}', { symbol: cryptoSymbol }) 
              : t('alertModal.title.create', 'Set Alert for {symbol}', { symbol: cryptoSymbol })}
          </DialogTitle>
          <DialogDescription>
            {t('alertModal.description', 'Current price: ${price}', { price: currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) || 'N/A' })}
            <br/>
            {t('alertModal.description.instruction', 'Get notified when the price goes above or below your target.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="targetPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('alertModal.form.targetPriceLabel', 'Target Price (USDT)')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('alertModal.form.targetPricePlaceholder', 'e.g., 50000')} {...field} step="any"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('alertModal.form.directionLabel', 'Notify me when price is')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('alertModal.form.directionPlaceholder', 'Select direction')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="above">{t('alertModal.form.direction.above', 'Above')}</SelectItem>
                      <SelectItem value="below">{t('alertModal.form.direction.below', 'Below')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between mt-6">
              {existingAlert && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {t('alertModal.button.delete', 'Delete Alert')}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={onClose}>
                    {t('alertModal.button.cancel', 'Cancel')}
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={isProcessing} className="bg-primary hover:bg-primary/90">
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingAlert ? t('alertModal.button.update', 'Update Alert') : t('alertModal.button.save', 'Set Alert')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
