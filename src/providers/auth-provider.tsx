// src/providers/auth-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { isFirebaseProperlyConfigured } from '@/lib/firebase/config';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import type { PriceAlert, AlertDirection, CryptoSymbol } from '@/lib/types';

// Simplified User type for a non-auth context if ever needed, but mostly will be null
export interface User {
  uid: string; 
  email?: string | null; 
  displayName?: string | null;
  // Removed Firebase specific fields
}

export interface AuthContextType {
  user: User | null; // Will always be null in this no-auth version
  loading: boolean; // Will quickly become false
  isFirebaseConfigValid: boolean;
  // Auth methods are now no-ops or removed
  signup: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: () => Promise<void>;
  updateUserPassword: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  // Alert methods will also be no-ops as they rely on a user
  saveUserPriceAlert: () => Promise<string | null>;
  getUserPriceAlerts: () => Promise<PriceAlert[]>;
  updateUserPriceAlert: () => Promise<void>;
  deleteUserPriceAlert: () => Promise<void>;
  deactivateUserPriceAlert: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); // Always null
  const [loading, setLoading] = useState(true); // Set to true initially, then false
  const [isFirebaseConfigValid, setIsFirebaseConfigValid] = useState(isFirebaseProperlyConfigured);
  
  const { translations, language, hydrated: languageHydrated } = useLanguage(); 
  const { toast } = useToast();

  const t = useCallback((key: string, fallback: string = key, vars?: Record<string, string | number>) => {
    let msg = languageHydrated ? (translations[key] || fallback) : fallback;
    if (vars && msg) {
      Object.keys(vars).forEach(varKey => {
        if (typeof msg === 'string') {
          msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        }
      });
    }
    return String(msg || key);
  }, [translations, language, languageHydrated]);

  useEffect(() => {
    console.log('AuthProvider: Initializing in no-auth mode.');
    setIsFirebaseConfigValid(isFirebaseProperlyConfigured);
    setUser(null); // Ensure user is always null
    setLoading(false); // Set loading to false quickly
  }, []);

  // No-op auth methods
  const noOpPromise = async () => { 
    toast({ title: t('auth.disabled.title', 'Authentication Disabled'), description: t('auth.disabled.description', 'User authentication is currently disabled in this application.'), variant: 'warning' });
    return Promise.resolve(); 
  };
  const noOpPromiseString = async (): Promise<string | null> => { 
    toast({ title: t('auth.disabled.title', 'Authentication Disabled'), description: t('auth.disabled.description', 'User authentication is currently disabled in this application.'), variant: 'warning' });
    return Promise.resolve(null); 
  };
  const noOpPromiseArray = async (): Promise<any[]> => { 
     toast({ title: t('auth.disabled.title', 'Authentication Disabled'), description: t('auth.disabled.description', 'User authentication is currently disabled in this application.'), variant: 'warning' });
    return Promise.resolve([]); 
  };


  const value = useMemo(() => ({
    user, // always null
    loading, // quickly false
    isFirebaseConfigValid,
    signup: noOpPromise,
    login: noOpPromise,
    logout: noOpPromise,
    sendPasswordResetEmail: noOpPromise,
    updateUserPassword: noOpPromise,
    loginWithGoogle: noOpPromise,
    loginWithFacebook: noOpPromise,
    loginWithTwitter: noOpPromise,
    loginWithApple: noOpPromise,
    saveUserPriceAlert: noOpPromiseString,
    getUserPriceAlerts: noOpPromiseArray as () => Promise<PriceAlert[]>, // Cast for type safety
    updateUserPriceAlert: noOpPromise,
    deleteUserPriceAlert: noOpPromise,
    deactivateUserPriceAlert: noOpPromise,
  }), [
    user, loading, isFirebaseConfigValid, t, language // Added t and language
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
