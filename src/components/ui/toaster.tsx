"use client"; // Ensure it's a client component

import * as React from "react"; 
import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useLanguage } from '@/hooks/use-language';


export function Toaster() {
  const { toasts } = useToast();
  const [isClient, setIsClient] = React.useState(false);
  const { translations, hydrated: languageHydrated } = useLanguage();


  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !languageHydrated) { 
    return null;
  }

  const t = (key: string, fallback: string) => translations[key] || fallback;


  return (
    <ToastProvider label={t('toaster.notificationsLabel', 'Notifications (F8)')}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}