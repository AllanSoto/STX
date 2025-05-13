
// src/providers/auth-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser, // Firebase User type
  GoogleAuthProvider, // Added for Google Sign-In
  signInWithPopup,    // Added for Google Sign-In
  FacebookAuthProvider, // Added for Facebook Sign-In
  TwitterAuthProvider, // Added for Twitter Sign-In (X)
  OAuthProvider, // Generic OAuth provider for Apple
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config'; // Firebase config
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, getDocs, collection, query, where, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language'; // For translations
import { useToast } from '@/hooks/use-toast'; // For notifications
import type { User, PriceAlert, AlertDirection, CryptoSymbol } from '@/lib/types'; // Custom User type, PriceAlert related types

// For Binance API interaction
// import crypto from 'crypto'; // Node.js crypto module for HMAC - COMMENTED OUT

// Define a base URL for Binance API - should be in constants or .env
const BINANCE_API_URL = 'https://api.binance.com'; // Or 'https://testnet.binance.vision' for testnet

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  usdtValue?: number; // Optional: to store converted USDT value
}

export interface Portfolio {
  balances: BinanceBalance[];
  totalUsdtValue: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  messageKey?: string; // For translation key of status/error message
}

export interface BinanceConnectionStatus {
  connected: boolean;
  messageKey: string;
  status: 'success' | 'error' | 'idle' | 'loading' | 'restricted';
  lastChecked?: Date;
}


export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<void>;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  updateApiKey: (apiKey: string, apiSecret: string) => Promise<boolean>;
  clearApiKey: () => Promise<void>;
  isBinanceApiConfigured: boolean;
  binanceConnectionStatus: BinanceConnectionStatus | null;
  validateApiKey: (apiKey: string, apiSecret: string) => Promise<boolean>;
  portfolio: Portfolio | null;
  fetchBinancePortfolio: () => Promise<void>;
  saveUserPriceAlert: (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection) => Promise<string | null>;
  getUserPriceAlerts: () => Promise<PriceAlert[]>;
  updateUserPriceAlert: (alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteUserPriceAlert: (alertId: string) => Promise<void>;
  deactivateUserPriceAlert: (alertId: string) => Promise<void>;
  retryBinanceConnection: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* // Comment out createSignature due to client-side incompatibility with 'crypto'
const createSignature = async (queryString: string, apiSecret: string): Promise<string> => {
  // This function should ideally be on the server-side (e.g., an API route or Server Action)
  // to protect the apiSecret.
  console.warn("createSignature is currently disabled due to Node.js 'crypto' module being incompatible with client-side execution in this context. Binance API calls requiring signatures will fail.");
  throw new Error("Signature creation is disabled in client-side AuthProvider.");
  // return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
};
*/

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { translations, language } = useLanguage();
  const { toast } = useToast();
  const [isBinanceApiConfigured, setIsBinanceApiConfigured] = useState(false);
  const [binanceConnectionStatus, setBinanceConnectionStatus] = useState<BinanceConnectionStatus | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>({ balances: [], totalUsdtValue: 0, status: 'idle' });
  const [manualRetryToggle, setManualRetryToggle] = useState(false);

  const t = useCallback((key: string, fallback: string = key, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback;
    if (vars) {
      Object.keys(vars).forEach(varKey => {
        msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return msg;
  }, [translations]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({ 
            uid: firebaseUser.uid, 
            email: firebaseUser.email, 
            displayName: firebaseUser.displayName || userData.displayName,
            ...userData // Spread other stored user data
          });
          setIsBinanceApiConfigured(!!userData.binanceApiKey && !!userData.binanceApiSecret);
          if (!!userData.binanceApiKey && !!userData.binanceApiSecret) {
            validateApiKey(userData.binanceApiKey, userData.binanceApiSecret);
          } else {
             setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.notConfigured', status: 'idle' });
          }
        } else {
          // Handle case where user exists in Auth but not Firestore (e.g. new social login)
           const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
          setIsBinanceApiConfigured(false);
          setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.notConfigured', status: 'idle' });
        }
      } else {
        setUser(null);
        setIsBinanceApiConfigured(false);
        setBinanceConnectionStatus(null);
        setPortfolio({ balances: [], totalUsdtValue: 0, status: 'idle' });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const retryBinanceConnection = useCallback(() => {
    if (user && user.binanceApiKey && user.binanceApiSecret) {
      setBinanceConnectionStatus(prev => prev ? {...prev, status: 'loading', messageKey: 'binance.connection.validating'} : {connected: false, messageKey: 'binance.connection.validating', status: 'loading'});
      validateApiKey(user.binanceApiKey, user.binanceApiSecret);
    } else {
      toast({title: t('binance.toast.error', 'Error'), description: t('binance.connection.notConfigured', 'Binance API keys not configured.'), variant: 'destructive'});
    }
  }, [user, /* validateApiKey - causes infinite loop if included directly */ BINANCE_API_URL, t]);


  const validateApiKey = useCallback(async (apiKey: string, apiSecret: string): Promise<boolean> => {
    if (!apiKey || !apiSecret) {
      setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.keysMissing', status: 'error' });
      return false;
    }
    setBinanceConnectionStatus({ connected: true, messageKey: 'binance.connection.validating', status: 'loading', lastChecked: new Date() });
    
    const queryString = `timestamp=${Date.now()}`;
    try {
      // Signature creation is disabled client-side. This will throw.
      // const signature = await createSignature(queryString, apiSecret);
      // const response = await fetch(`${BINANCE_API_URL}/api/v3/account?${queryString}&signature=${signature}`, {
      //   method: 'GET',
      //   headers: {
      //     'X-MBX-APIKEY': apiKey,
      //     'Content-Type': 'application/json',
      //   },
      // });

      // Simulate error because createSignature is disabled
      console.warn("API Key validation is currently disabled because signature creation is not available on the client. Assuming validation failed.");
      const simulatedError = new Error("Client-side signature creation disabled.");
      // @ts-ignore
      simulatedError.response = { status: 400, data: { msg: "Client-side signature creation disabled." } };
      throw simulatedError;

      // This part will not be reached with the above simulation
      /*
      if (response.ok) {
        setBinanceConnectionStatus({ connected: true, messageKey: 'binance.connection.success', status: 'success', lastChecked: new Date() });
        return true;
      } else {
        const errorData = await response.json();
        console.error('Binance API Key Validation Error:', errorData, response.status);
        let messageKey = 'binance.connection.errorGeneric';
        if (response.status === 401) messageKey = 'binance.connection.errorUnauthorized';
        if (errorData.msg && errorData.msg.toLowerCase().includes("restricted location")) {
            messageKey = 'binance.connection.errorRestrictedLocation';
            setBinanceConnectionStatus({ connected: false, messageKey, status: 'restricted', lastChecked: new Date() });
        } else {
            setBinanceConnectionStatus({ connected: false, messageKey, status: 'error', lastChecked: new Date() });
        }
        return false;
      }
      */

    } catch (error: any) {
      console.error('Error validating Binance API key:', error);
      let messageKey = 'binance.connection.errorNetwork';
      let errorStatus: BinanceConnectionStatus['status'] = 'error';

      if (error.message === "Client-side signature creation disabled.") {
        messageKey = 'binance.connection.errorSignatureDisabled';
      } else if (error.response && error.response.data && error.response.data.msg && error.response.data.msg.toLowerCase().includes("restricted location")) {
        messageKey = 'binance.connection.errorRestrictedLocation';
        errorStatus = 'restricted';
      } else if (error.response && error.response.status === 401) {
        messageKey = 'binance.connection.errorUnauthorized';
      }
      
      setBinanceConnectionStatus({ connected: false, messageKey, status: errorStatus, lastChecked: new Date() });
      return false;
    }
  }, [t, BINANCE_API_URL, manualRetryToggle]); // Added manualRetryToggle

  const signup = async (email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || email.split('@')[0], // Default display name
        createdAt: serverTimestamp(),
        // Initialize Binance API keys as empty
        binanceApiKey: '',
        binanceApiSecret: '',
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      setUser(newUser); // Set user in context
      setIsBinanceApiConfigured(false);
      setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.notConfigured', status: 'idle' });

    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(t('signup.error.emailTaken', 'This email is already registered.'));
      }
      throw error;
    }
  };

  const login = async (email: string, pass: string, rememberMe: boolean = false) => {
    // Firebase persistence is handled globally in firebase/config.ts or dynamically if needed
    // For simplicity, 'rememberMe' doesn't change persistence here post-initial setup
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will handle setting user state
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsBinanceApiConfigured(false);
    setBinanceConnectionStatus(null);
    setPortfolio({ balances: [], totalUsdtValue: 0, status: 'idle' });
    router.push('/login');
  };

  const sendPasswordResetEmailLink = async (email: string) => { // Renamed for clarity
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserPasswordInternal = async (currentPass: string, newPass: string) => { // Renamed
    if (auth.currentUser) {
      // Re-authentication might be needed for sensitive operations like changing password.
      // This example assumes re-authentication is handled if Firebase requires it.
      await updatePassword(auth.currentUser, newPass);
    } else {
      throw new Error("No user currently signed in.");
    }
  };
  
  const socialLogin = async (provider: GoogleAuthProvider | FacebookAuthProvider | TwitterAuthProvider | OAuthProvider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // New user via social login
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: serverTimestamp(),
          binanceApiKey: '',
          binanceApiSecret: '',
        };
        await setDoc(userDocRef, newUser);
        setUser(newUser);
        setIsBinanceApiConfigured(false);
        setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.notConfigured', status: 'idle' });
      } else {
        // Existing user, onAuthStateChanged will handle update
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Social login error:", error);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  };

  const loginWithGoogle = () => socialLogin(new GoogleAuthProvider());
  const loginWithFacebook = () => socialLogin(new FacebookAuthProvider());
  const loginWithTwitter = () => socialLogin(new TwitterAuthProvider()); // Note: Twitter may have issues
  const loginWithApple = () => socialLogin(new OAuthProvider('apple.com'));


  const updateApiKey = async (apiKey: string, apiSecret: string): Promise<boolean> => {
    if (!user) throw new Error(t('binance.toast.errorUser', 'User not logged in.'));
    const isValid = await validateApiKey(apiKey, apiSecret);
    if (isValid) {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { binanceApiKey: apiKey, binanceApiSecret: apiSecret });
      setUser(prevUser => prevUser ? { ...prevUser, binanceApiKey: apiKey, binanceApiSecret: apiSecret } : null);
      setIsBinanceApiConfigured(true);
      toast({ title: t('binance.toast.keysUpdatedTitle', 'API Keys Updated'), description: t('binance.toast.keysUpdatedSuccess', 'Your Binance API keys have been updated and verified.')});
      return true;
    } else {
      // Keep old keys if new ones are invalid, or clear them - current behavior is to let validateApiKey set the error status
      toast({ title: t('binance.toast.keysUpdatedFailedTitle', 'API Key Update Failed'), description: t('binance.toast.keysUpdatedFailedDesc', 'Validation of new API keys failed. Please check them and try again.'), variant: "destructive"});
      return false;
    }
  };

  const clearApiKey = async () => {
    if (!user) throw new Error(t('binance.toast.errorUser', 'User not logged in.'));
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { binanceApiKey: '', binanceApiSecret: '' });
    setUser(prevUser => prevUser ? { ...prevUser, binanceApiKey: undefined, binanceApiSecret: undefined } : null);
    setIsBinanceApiConfigured(false);
    setBinanceConnectionStatus({ connected: false, messageKey: 'binance.connection.keysCleared', status: 'idle' });
    setPortfolio({ balances: [], totalUsdtValue: 0, status: 'idle' });
    toast({ title: t('binance.toast.keysClearedTitle', 'API Keys Cleared'), description: t('binance.toast.keysClearedSuccess', 'Your Binance API keys have been cleared.') });
  };

  const fetchBinancePortfolio = useCallback(async (): Promise<void> => {
    if (!user || !user.binanceApiKey || !user.binanceApiSecret || !isBinanceApiConfigured || binanceConnectionStatus?.status === 'restricted') {
        let messageKey = 'binance.balances.errorNotConfigured';
        if (binanceConnectionStatus?.status === 'restricted') {
            messageKey = 'binance.connection.errorRestrictedLocation';
        } else if (!isBinanceApiConfigured) {
            messageKey = 'binance.balances.errorNotConfigured';
        }
        setPortfolio({ balances: [], totalUsdtValue: 0, status: 'idle', messageKey });
        return;
    }

    setPortfolio(prev => ({ ...(prev || { balances: [], totalUsdtValue: 0 }), status: 'loading', messageKey: 'binance.balances.loading' }));
    const queryString = `timestamp=${Date.now()}`;
    try {
      // Signature creation is disabled client-side. This will throw.
      // const signature = await createSignature(queryString, user.binanceApiSecret);
      // const response = await fetch(`${BINANCE_API_URL}/api/v3/account?${queryString}&signature=${signature}`, {
      //   method: 'GET',
      //   headers: { 'X-MBX-APIKEY': user.binanceApiKey },
      // });
      
      console.warn("Fetching Binance balances is currently disabled because signature creation is not available on the client.");
      setPortfolio({ balances: [], totalUsdtValue: 0, status: 'error', messageKey: 'binance.connection.errorSignatureDisabled' });
      return;

      // This part will not be reached due to the above
      /*
      if (!response.ok) {
        const errorData = await response.json();
         let msgKey = 'binance.balances.errorGeneric';
         if (errorData.msg && errorData.msg.toLowerCase().includes("restricted location")) {
            msgKey = 'binance.connection.errorRestrictedLocation';
         } else if (response.status === 401) {
            msgKey = 'binance.balances.errorUnauthorized';
         }
        throw new Error(t(msgKey, `Binance API error: ${response.status} ${errorData.msg || ''}`));
      }

      const accountInfo = await response.json();
      const relevantBalances = accountInfo.balances.filter((b: any) => parseFloat(b.free) > 0);
      setPortfolio({ balances: relevantBalances, totalUsdtValue: 0, status: 'success', messageKey: 'binance.balances.loadedSuccess' });
      */

    } catch (error: any) {
      console.error('Error fetching Binance portfolio:', error);
      let messageKey = 'binance.balances.errorGeneric';
      if (error.message && error.message.includes("Binance API error: 401")) {
          messageKey = 'binance.balances.errorUnauthorized';
      } else if (error.message && (
          error.message.includes(t('binance.connection.errorRestrictedLocation','')) || // Check against translated string
          error.message.toLowerCase().includes("restricted location") // Fallback check
      )) {
          messageKey = 'binance.connection.errorRestrictedLocation';
      } else if (error.message === "Client-side signature creation disabled.") {
        messageKey = 'binance.connection.errorSignatureDisabled';
      }
      setPortfolio({ balances: [], totalUsdtValue: 0, status: 'error', messageKey});
    }
  }, [user, isBinanceApiConfigured, BINANCE_API_URL, t, binanceConnectionStatus?.status]);

  // Placeholder Price Alert Functions (interact with Firebase)
  const saveUserPriceAlert = async (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection): Promise<string | null> => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return null; }
    try {
      const alertsCollectionRef = collection(db, 'users', user.uid, 'priceAlerts');
      const docRef = await addDoc(alertsCollectionRef, {
        symbol, targetPrice, direction, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) { console.error("Error saving alert: ", e); toast({ title: "Error", description: "Could not save alert.", variant: "destructive" }); return null; }
  };

  const getUserPriceAlerts = async (): Promise<PriceAlert[]> => {
    if (!user) return [];
    try {
      const alertsCollectionRef = collection(db, 'users', user.uid, 'priceAlerts');
      const q = query(alertsCollectionRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as PriceAlert));
    } catch (e) { console.error("Error fetching alerts: ", e); return []; }
  };
  
  const updateUserPriceAlert = async (alertId: string, updates: Partial<Omit<PriceAlert, 'id'|'userId'|'createdAt'>>) => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    try {
      const alertRef = doc(db, 'users', user.uid, 'priceAlerts', alertId);
      await updateDoc(alertRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (e) { console.error("Error updating alert: ", e); toast({ title: "Error", description: "Could not update alert.", variant: "destructive" });}
  };

  const deleteUserPriceAlert = async (alertId: string) => {
     if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    try {
      const alertRef = doc(db, 'users', user.uid, 'priceAlerts', alertId);
      await deleteDoc(alertRef);
    } catch (e) { console.error("Error deleting alert: ", e); toast({ title: "Error", description: "Could not delete alert.", variant: "destructive" });}
  };
  
  const deactivateUserPriceAlert = async (alertId: string) => {
     if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    await updateUserPriceAlert(alertId, { active: false, triggeredAt: serverTimestamp() });
  };


  const value = useMemo(() => ({
    user,
    loading,
    signup,
    login,
    logout,
    sendPasswordResetEmail: sendPasswordResetEmailLink,
    updateUserPassword: updateUserPasswordInternal,
    loginWithGoogle,
    loginWithFacebook,
    loginWithTwitter,
    loginWithApple,
    updateApiKey,
    clearApiKey,
    isBinanceApiConfigured,
    binanceConnectionStatus,
    validateApiKey,
    portfolio,
    fetchBinancePortfolio,
    saveUserPriceAlert,
    getUserPriceAlerts,
    updateUserPriceAlert,
    deleteUserPriceAlert,
    deactivateUserPriceAlert,
    retryBinanceConnection,
  }), [
    user, loading, signup, login, logout, sendPasswordResetEmailLink, updateUserPasswordInternal, 
    loginWithGoogle, loginWithFacebook, loginWithTwitter, loginWithApple,
    updateApiKey, clearApiKey, isBinanceApiConfigured, binanceConnectionStatus, validateApiKey,
    portfolio, fetchBinancePortfolio,
    saveUserPriceAlert, getUserPriceAlerts, updateUserPriceAlert, deleteUserPriceAlert, deactivateUserPriceAlert,
    retryBinanceConnection
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
