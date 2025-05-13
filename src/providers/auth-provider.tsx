// src/providers/auth-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth, db, isFirebaseProperlyConfigured, setAuthPersistence as setFbAuthPersistence } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import type { User, PriceAlert, AlertDirection, CryptoSymbol } from '@/lib/types';
import { savePriceAlert, getActivePriceAlertsForUser, updatePriceAlert as fbUpdatePriceAlert, deletePriceAlert as fbDeletePriceAlert, deactivatePriceAlert as fbDeactivatePriceAlert } from '@/lib/firebase/alerts';


export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigValid: boolean;
  signup: (email: string, pass: string) => Promise<void>;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  saveUserPriceAlert: (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection) => Promise<string | null>;
  getUserPriceAlerts: () => Promise<PriceAlert[]>;
  updateUserPriceAlert: (alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteUserPriceAlert: (alertId: string) => Promise<void>;
  deactivateUserPriceAlert: (alertId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigValid, setIsFirebaseConfigValid] = useState(isFirebaseProperlyConfigured);
  const router = useRouter();
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
    setIsFirebaseConfigValid(isFirebaseProperlyConfigured);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isFirebaseProperlyConfigured) { // Check the flag from config.ts
        setUser(null);
        setLoading(false);
        // Optionally, show a persistent warning if config is invalid
        // toast({ title: "Configuration Error", description: "Firebase is not properly configured.", variant: "destructive" });
        return;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || userData.displayName,
              // @ts-ignore
              createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(userData.createdAt?.seconds * 1000 || Date.now()),
            });
          } else {
            const newUserPayload = { // Explicitly type for clarity
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUserPayload);
            setUser({ 
              uid: newUserPayload.uid, 
              email: newUserPayload.email, 
              displayName: newUserPayload.displayName, 
              // @ts-ignore
              createdAt: new Date() // For local state after creation
            });
          }
        } catch (err: any) {
          console.error("AuthProvider: Error fetching/setting user document:", err);
          if (err.code === 'unavailable' || (err.message && err.message.includes('offline'))) {
            toast({
              title: t('firebase.offline.title', 'Offline'),
              description: t('firebase.offline.userDataError', 'Could not load user data. You appear to be offline. Some features may be limited.'),
              variant: 'warning', // Use warning for less severe than destructive
            });
            // Set a minimal user object if offline and profile data can't be fetched
            // This acknowledges authentication but indicates data might be stale/incomplete.
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || t('app.name', 'SimulTradex')});
          } else {
             toast({
              title: t('firebase.generalError.title', 'Error'),
              description: t('firebase.generalError.userDataError', 'An error occurred while loading user data.'),
              variant: 'destructive',
            });
            setUser(null); 
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [t, toast]); // Removed isFirebaseConfigValid from deps as it's set from a module-level var

  const signup = async (email: string, pass: string) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'));
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const newUserPayload = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || email.split('@')[0] || 'New User',
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserPayload);
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(t('signup.error.emailTaken', 'This email is already registered.'));
      } else if (error.code === 'auth/api-key-not-valid') {
         toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid'), variant: 'destructive' });
      } else {
        toast({ title: t('signup.toast.errorTitle', 'Signup Failed'), description: error.message || t('signup.toast.errorDescription', 'Could not create account.'), variant: 'destructive' });
      }
      throw error;
    }
  };

  const login = async (email: string, pass: string, rememberMe: boolean = false) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessageLogin', 'Login is unavailable...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessageLogin', 'Login is unavailable...'));
    }
    await setFbAuthPersistence(rememberMe);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push('/dashboard'); // Redirect after successful login
    } catch (error: any) {
       console.error("Login error:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast({ title: t('login.toast.errorTitle', 'Login Failed'), description: t('login.toast.errorDescriptionInvalid', 'Invalid email or password.'), variant: 'destructive' });
      } else if (error.code === 'auth/too-many-requests') {
        toast({ title: t('login.toast.errorTitle', 'Login Failed'), description: t('login.toast.errorDescriptionTooManyRequests', 'Access to this account has been temporarily disabled...'), variant: 'destructive' });
      } else if (error.code === 'auth/api-key-not-valid') {
         toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid'), variant: 'destructive' });
      } else {
        toast({ title: t('login.toast.errorTitle', 'Login Failed'), description: error.message || t('login.toast.errorDescription', 'An unknown error occurred.'), variant: 'destructive' });
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Clear local user state
      router.push('/login');
      toast({title: t('login.toast.logoutSuccessTitle', "Logged Out"), description: t('login.toast.logoutSuccessDescription',"You have been successfully logged out.")})
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({title: t('login.toast.logoutErrorTitle', "Logout Failed"), description: error.message || t('login.toast.logoutErrorDescription', "Could not log out."), variant: "destructive"})
    }
  };

  const sendPasswordResetEmailHandler = async (email: string) => { 
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot send password reset...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessage', 'Cannot send password reset...'));
    }
    try {
      await fbSendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Password reset email error:", error);
      toast({ title: t('login.forgotPassword.toast.emailErrorTitle', 'Error Sending Email'), description: error.message || t('login.forgotPassword.toast.emailErrorDescription', 'Could not send password reset email.'), variant: 'destructive' });
      throw error;
    }
  };

  const updateUserPasswordHandler = async (currentPass: string, newPass: string) => { 
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot update password...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessage', 'Cannot update password...'));
    }
    const fUser = auth.currentUser;
    if (fUser && fUser.email) {
      const credential = EmailAuthProvider.credential(fUser.email, currentPass);
      try {
        await reauthenticateWithCredential(fUser, credential);
        await updatePassword(fUser, newPass);
      } catch (error: any) {
        console.error("Update password error:", error);
        throw error; 
      }
    } else {
      throw new Error("No user currently signed in or email not available for re-authentication.");
    }
  };

  const socialLogin = async (provider: GoogleAuthProvider | FacebookAuthProvider | TwitterAuthProvider | OAuthProvider) => {
     if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot perform social login...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessage', 'Cannot perform social login...'));
    }
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUserPayload = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUserPayload);
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Social login error:", error);
       if (error.code === 'auth/api-key-not-valid') {
        toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid'), variant: 'destructive' });
      } else {
        toast({ title: t('login.toast.errorTitle', "Login Failed"), description: error.message || t('login.toast.errorDescription', "An unknown error occurred."), variant: "destructive" });
      }
      throw error; 
    }
  };

  const loginWithGoogle = () => socialLogin(new GoogleAuthProvider());
  const loginWithFacebook = () => socialLogin(new FacebookAuthProvider());
  const loginWithTwitter = () => socialLogin(new TwitterAuthProvider());
  const loginWithApple = () => socialLogin(new OAuthProvider('apple.com'));

  const saveUserPriceAlertHandler = async (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection): Promise<string | null> => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return null; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot save alert...'), variant: "destructive" }); return null; }
    try {
      return await savePriceAlert(user.uid, { symbol, targetPrice, direction });
    } catch (e: any) { 
      console.error("Error saving alert: ", e); 
      const desc = (e.message && e.message.includes('offline')) 
          ? t('firebase.offline.fetchError', 'Could not save alert. You appear to be offline.')
          : e.message || t('alertModal.toast.errorDescriptionGeneric',"Could not save alert.");
      toast({ title: t('alertModal.toast.errorTitle', "Error"), description: desc, variant: "destructive" }); 
      return null; 
    }
  };

  const getUserPriceAlertsHandler = async (): Promise<PriceAlert[]> => {
    if (!user) return [];
    if (!isFirebaseConfigValid) return [];
    try {
      return await getActivePriceAlertsForUser(user.uid);
    } catch (e: any) { 
      console.error("Error fetching alerts: ", e); 
      const desc = (e.message && e.message.includes('offline')) 
          ? t('firebase.offline.fetchError', 'Could not load alerts. You appear to be offline.')
          : e.message || t('activeAlerts.toast.fetchErrorDescription',"Could not load alerts.");
      toast({ title: t('activeAlerts.toast.fetchErrorTitle', "Error"), description: desc, variant: "destructive" });
      return []; 
    }
  };

  const updateUserPriceAlertHandler = async (alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot update alert...'), variant: "destructive" }); return; }
    try {
      await fbUpdatePriceAlert(user.uid, alertId, updates);
    } catch (e: any) { 
      console.error("Error updating alert: ", e); 
      const desc = (e.message && e.message.includes('offline')) 
          ? t('firebase.offline.fetchError', 'Could not update alert. You appear to be offline.')
          : e.message || t('alertModal.toast.errorDescriptionGeneric',"Could not update alert.");
      toast({ title: t('alertModal.toast.errorUpdateTitle', "Error"), description: desc, variant: "destructive" }); 
    }
  };

  const deleteUserPriceAlertHandler = async (alertId: string) => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot delete alert...'), variant: "destructive" }); return; }
    try {
      await fbDeletePriceAlert(user.uid, alertId);
    } catch (e: any) { 
      console.error("Error deleting alert: ", e);
      const desc = (e.message && e.message.includes('offline')) 
          ? t('firebase.offline.fetchError', 'Could not delete alert. You appear to be offline.')
          : e.message || t('alertModal.toast.errorDescriptionGenericDelete',"Could not delete alert.");
      toast({ title: t('alertModal.toast.errorDeleteTitle', "Error"), description: desc, variant: "destructive" }); 
    }
  };

  const deactivateUserPriceAlertHandler = async (alertId: string) => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return; }
     if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot deactivate alert...'), variant: "destructive" }); return; }
    try {
      await fbDeactivatePriceAlert(user.uid, alertId);
    } catch (e: any) {
       console.error("Error deactivating alert: ", e); 
       const desc = (e.message && e.message.includes('offline')) 
          ? t('firebase.offline.fetchError', 'Could not deactivate alert. You appear to be offline.')
          : e.message || t('activeAlerts.toast.toggleErrorDescription',"Could not update alert status.");
       toast({ title: t('activeAlerts.toast.toggleErrorTitle', "Error"), description: desc, variant: "destructive" }); 
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    isFirebaseConfigValid,
    signup,
    login,
    logout,
    sendPasswordResetEmail: sendPasswordResetEmailHandler,
    updateUserPassword: updateUserPasswordHandler,
    loginWithGoogle,
    loginWithFacebook,
    loginWithTwitter,
    loginWithApple,
    saveUserPriceAlert: saveUserPriceAlertHandler,
    getUserPriceAlerts: getUserPriceAlertsHandler,
    updateUserPriceAlert: updateUserPriceAlertHandler,
    deleteUserPriceAlert: deleteUserPriceAlertHandler,
    deactivateUserPriceAlert: deactivateUserPriceAlertHandler,
  }), [
    user, loading, isFirebaseConfigValid, t, // Ensure t is in deps
    // Assuming other functions (signup, login etc.) are stable due to useCallback or their own memoization
    // If they also use `t`, they need to be wrapped in useCallback with `t` in their deps too.
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};