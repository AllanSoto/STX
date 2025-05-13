// src/providers/auth-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail, // Renamed to avoid conflict
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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, getDocs, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
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
  const { translations, language } = useLanguage(); // Added language
  const { toast } = useToast();

  const t = useCallback((key: string, fallback: string = key) => {
    return translations[key] || fallback;
  }, [translations]);

  useEffect(() => {
    if (isFirebaseConfigValid !== isFirebaseProperlyConfigured) {
        setIsFirebaseConfigValid(isFirebaseProperlyConfigured);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isFirebaseConfigValid) {
        setUser(null);
        setLoading(false);
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
              createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(userData.createdAt?.seconds * 1000 || Date.now()),
              // Include other fields from userData if necessary
            });
          } else {
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newUser);
            setUser({ ...newUser, createdAt: new Date() }); // Set createdAt to current date for local state
          }
        } catch (err: any) {
          console.error("AuthProvider: Error fetching/setting user document:", err);
          if (err.code === 'unavailable') {
            toast({
              title: t('firebase.offline.title', 'Offline'),
              description: t('firebase.offline.userDataError', 'Could not load user data. You appear to be offline. Some features may be limited.'),
              variant: 'destructive',
            });
            // Set a minimal user object if offline and profile data can't be fetched
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] });
          } else {
             toast({
              title: t('firebase.generalError.title', 'Error'),
              description: t('firebase.generalError.userDataError', 'An error occurred while loading user data.'),
              variant: 'destructive',
            });
            setUser(null); // Or minimal user
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isFirebaseConfigValid, t, toast]);

  const signup = async (email: string, pass: string) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessageSignup', 'Account creation is unavailable...'));
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || email.split('@')[0] || 'New User',
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(t('signup.error.emailTaken', 'This email is already registered.'));
      } else if (error.code === 'auth/api-key-not-valid') {
         toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid'), variant: 'destructive' });
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
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const sendPasswordResetEmailHandler = async (email: string) => { // Renamed from sendPasswordResetEmail
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot send password reset...'), variant: 'destructive' });
      throw new Error(t('firebase.config.errorMessage', 'Cannot send password reset...'));
    }
    await fbSendPasswordResetEmail(auth, email);
  };

  const updateUserPasswordHandler = async (currentPass: string, newPass: string) => { // Renamed
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
        throw error; // Re-throw to be caught by the form
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
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUser);
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Social login error:", error);
       if (error.code === 'auth/api-key-not-valid') {
        toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid'), variant: 'destructive' });
      } else {
        toast({ title: t('login.toast.errorTitle', "Login Failed"), description: error.message || t('login.toast.errorDescription', "An unknown error occurred."), variant: "destructive" });
      }
      throw error; // Re-throw to be caught by calling component if needed
    }
  };

  const loginWithGoogle = () => socialLogin(new GoogleAuthProvider());
  const loginWithFacebook = () => socialLogin(new FacebookAuthProvider());
  const loginWithTwitter = () => socialLogin(new TwitterAuthProvider());
  const loginWithApple = () => socialLogin(new OAuthProvider('apple.com'));

  // Price Alert Functions
  const saveUserPriceAlertHandler = async (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection): Promise<string | null> => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return null; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot save alert...'), variant: "destructive" }); return null; }
    try {
      return await savePriceAlert(user.uid, { symbol, targetPrice, direction });
    } catch (e: any) { 
      console.error("Error saving alert: ", e); 
      toast({ title: t('alertModal.toast.errorTitle', "Error"), description: e.message || t('alertModal.toast.errorDescriptionGeneric',"Could not save alert."), variant: "destructive" }); 
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
      toast({ title: t('activeAlerts.toast.fetchErrorTitle', "Error"), description: e.message || t('activeAlerts.toast.fetchErrorDescription',"Could not load alerts."), variant: "destructive" });
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
      toast({ title: t('alertModal.toast.errorUpdateTitle', "Error"), description: e.message || t('alertModal.toast.errorDescriptionGeneric',"Could not update alert."), variant: "destructive" }); 
    }
  };

  const deleteUserPriceAlertHandler = async (alertId: string) => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot delete alert...'), variant: "destructive" }); return; }
    try {
      await fbDeletePriceAlert(user.uid, alertId);
    } catch (e: any) { 
      console.error("Error deleting alert: ", e); 
      toast({ title: t('alertModal.toast.errorDeleteTitle', "Error"), description: e.message || t('alertModal.toast.errorDescriptionGenericDelete',"Could not delete alert."), variant: "destructive" }); 
    }
  };

  const deactivateUserPriceAlertHandler = async (alertId: string) => {
    if (!user) { toast({ title: t('alertModal.toast.authErrorTitle',"Error"), description: t('alertModal.toast.authErrorDescription',"User not logged in."), variant: "destructive" }); return; }
    try {
      await fbDeactivatePriceAlert(user.uid, alertId);
    } catch (e: any) {
       console.error("Error deactivating alert: ", e); 
       toast({ title: t('activeAlerts.toast.toggleErrorTitle', "Error"), description: e.message || t('activeAlerts.toast.toggleErrorDescription',"Could not update alert status."), variant: "destructive" }); 
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
    user, loading, isFirebaseConfigValid, language, t, // Added language and t
    // Assuming other functions (signup, login etc.) are stable due to useCallback or their own memoization
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
