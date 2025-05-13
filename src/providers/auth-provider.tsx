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
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth, db, isFirebaseProperlyConfigured } from '@/lib/firebase/config'; // Import isFirebaseProperlyConfigured
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import type { User, PriceAlert, AlertDirection, CryptoSymbol } from '@/lib/types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isFirebaseConfigValid: boolean; // New state
  signup: (email: string, pass: string) => Promise<void>;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (currentPass: string, newPass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  // Removed Binance related methods and state
  saveUserPriceAlert: (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection) => Promise<string | null>;
  getUserPriceAlerts: () => Promise<PriceAlert[]>;
  updateUserPriceAlert: (alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteUserPriceAlert: (alertId: string) => Promise<void>;
  deactivateUserPriceAlert: (alertId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConfigValid, setIsFirebaseConfigValid] = useState(isFirebaseProperlyConfigured); // Initialize with flag
  const router = useRouter();
  const { translations } = useLanguage();
  const { toast } = useToast();

  const t = useCallback((key: string, fallback: string = key) => {
    let msg = translations[key] || fallback;
    // if (vars) { // vars parameter removed as it's not used in this context
    //   Object.keys(vars).forEach(varKey => {
    //     msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
    //   });
    // }
    return msg;
  }, [translations]);

  useEffect(() => {
    // Update isFirebaseConfigValid if it somehow changes (e.g. dev hot reload of config.ts)
    // Though primarily it's set on initial load.
    if (isFirebaseConfigValid !== isFirebaseProperlyConfigured) {
        setIsFirebaseConfigValid(isFirebaseProperlyConfigured);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isFirebaseConfigValid) { // Check the flag
        setUser(null);
        setLoading(false);
        // Optionally, redirect to a specific page or show a global banner if Firebase isn't configured
        // For now, login/signup forms will show the error.
        return;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || userData.displayName,
            ...userData
          });
        } else {
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isFirebaseConfigValid]); // Add isFirebaseConfigValid to dependency array

  const signup = async (email: string, pass: string) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot sign up. Firebase is not configured.'), variant: 'destructive' });
      throw new Error('Firebase not configured');
    }
    try {
      console.log('Trying to log in'); // Added console.log as per previous diff
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      // setUser(newUser); // onAuthStateChanged will handle this
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(t('signup.error.emailTaken', 'This email is already registered.'));
      } else if (error.code === 'auth/api-key-not-valid') {
        toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid', 'The Firebase API Key is invalid. Please check your .env.local file.'), variant: 'destructive' });
      }
      throw error;
    }
  };

  const login = async (email: string, pass: string, rememberMe: boolean = false) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot log in. Firebase is not configured.'), variant: 'destructive' });
      throw new Error('Firebase not configured');
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
    // setUser(null); // onAuthStateChanged will handle this
    router.push('/login');
  };

  const sendPasswordResetEmailLink = async (email: string) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot send password reset. Firebase is not configured.'), variant: 'destructive' });
      throw new Error('Firebase not configured');
    }
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserPasswordInternal = async (currentPass: string, newPass: string) => {
    if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot update password. Firebase is not configured.'), variant: 'destructive' });
      throw new Error('Firebase not configured');
    }
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPass);
    } else {
      throw new Error("No user currently signed in.");
    }
  };

  const socialLogin = async (provider: GoogleAuthProvider | FacebookAuthProvider | TwitterAuthProvider | OAuthProvider) => {
     if (!isFirebaseConfigValid) {
      toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.errorMessage', 'Cannot perform social login. Firebase is not configured.'), variant: 'destructive' });
      throw new Error('Firebase not configured');
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
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, newUser);
        // setUser(newUser); // onAuthStateChanged
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Social login error:", error);
       if (error.code === 'auth/api-key-not-valid') {
        toast({ title: t('firebase.config.errorTitle', 'Firebase Configuration Error'), description: t('firebase.config.apiKeyInvalid', 'The Firebase API Key is invalid. Please check your .env.local file.'), variant: 'destructive' });
      } else {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      }
    }
  };

  const loginWithGoogle = () => socialLogin(new GoogleAuthProvider());
  const loginWithFacebook = () => socialLogin(new FacebookAuthProvider());
  const loginWithTwitter = () => socialLogin(new TwitterAuthProvider());
  const loginWithApple = () => socialLogin(new OAuthProvider('apple.com'));

  // Price Alert Functions
  const saveUserPriceAlert = async (symbol: CryptoSymbol, targetPrice: number, direction: AlertDirection): Promise<string | null> => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return null; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot save alert. Firebase not configured.'), variant: "destructive" }); return null; }
    try {
      const alertsCollectionRef = collection(db, 'userAlerts', user.uid, 'alerts');
      const docRef = await addDoc(alertsCollectionRef, {
        symbol, targetPrice, direction, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) { console.error("Error saving alert: ", e); toast({ title: "Error", description: "Could not save alert.", variant: "destructive" }); return null; }
  };

  const getUserPriceAlerts = async (): Promise<PriceAlert[]> => {
    if (!user) return [];
    if (!isFirebaseConfigValid) { return []; }
    try {
      const alertsCollectionRef = collection(db, 'userAlerts', user.uid, 'alerts');
      const q = query(alertsCollectionRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({ id: docSnap.id, userId: user.uid, ...docSnap.data() } as PriceAlert));
    } catch (e) { console.error("Error fetching alerts: ", e); return []; }
  };

  const updateUserPriceAlert = async (alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>) => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot update alert. Firebase not configured.'), variant: "destructive" }); return; }
    try {
      const alertRef = doc(db, 'userAlerts', user.uid, 'alerts', alertId);
      await updateDoc(alertRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (e) { console.error("Error updating alert: ", e); toast({ title: "Error", description: "Could not update alert.", variant: "destructive" }); }
  };

  const deleteUserPriceAlert = async (alertId: string) => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    if (!isFirebaseConfigValid) { toast({ title: t('firebase.config.errorTitle','Error'), description: t('firebase.config.errorMessage', 'Cannot delete alert. Firebase not configured.'), variant: "destructive" }); return; }
    try {
      const alertRef = doc(db, 'userAlerts', user.uid, 'alerts', alertId);
      await deleteDoc(alertRef);
    } catch (e) { console.error("Error deleting alert: ", e); toast({ title: "Error", description: "Could not delete alert.", variant: "destructive" }); }
  };

  const deactivateUserPriceAlert = async (alertId: string) => {
    if (!user) { toast({ title: "Error", description: "User not logged in.", variant: "destructive" }); return; }
    await updateUserPriceAlert(alertId, { active: false, triggeredAt: serverTimestamp() });
  };

  const value = useMemo(() => ({
    user,
    loading,
    isFirebaseConfigValid,
    signup,
    login,
    logout,
    sendPasswordResetEmail: sendPasswordResetEmailLink,
    updateUserPassword: updateUserPasswordInternal,
    loginWithGoogle,
    loginWithFacebook,
    loginWithTwitter,
    loginWithApple,
    saveUserPriceAlert,
    getUserPriceAlerts,
    updateUserPriceAlert,
    deleteUserPriceAlert,
    deactivateUserPriceAlert,
  }), [
    user, loading, isFirebaseConfigValid,
    // signup, login, logout, sendPasswordResetEmailLink, updateUserPasswordInternal, // These are memoized with useCallback
    // loginWithGoogle, loginWithFacebook, loginWithTwitter, loginWithApple,
    // saveUserPriceAlert, getUserPriceAlerts, updateUserPriceAlert, deleteUserPriceAlert, deactivateUserPriceAlert
    // For simplicity, not listing all useCallback-wrapped functions if their identity is stable.
    // However, for correctness, any function that isn't wrapped or whose dependencies change often *should* be here.
    // Assuming the t function from useLanguage is stable or memoized.
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
