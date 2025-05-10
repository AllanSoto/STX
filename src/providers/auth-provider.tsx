
'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language'; // For translation of error messages

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateApiKey: (apiKey: string, apiSecret: string) => void;
  isConnectedToBinance: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for strong password validation (can be moved to a utils file)
const isStrongPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
};


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectedToBinance, setIsConnectedToBinance] = useState(false);
  const router = useRouter();
  const { translations } = useLanguage(); // Ensure LanguageProvider is above AuthProvider in layout
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;


  useEffect(() => {
    const storedUser = localStorage.getItem('simultradex_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        if (parsedUser.binanceApiKey && parsedUser.binanceApiSecret) {
          // Mock successful connection
          setIsConnectedToBinance(true);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('simultradex_user');
      }
    }
    setIsLoading(false);
  }, []);

  const persistUser = (userData: User | null) => {
    if (userData) {
      localStorage.setItem('simultradex_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('simultradex_user');
    }
  };

  const login = useCallback(async (email: string, pass: string) => {
    // Client-side form validation should handle password strength format,
    // but we ensure it here too for robustness (though in a real app, backend handles this)
    if (!isStrongPassword(pass)) {
      // This specific error should ideally be caught by the form's Zod schema first.
      // If it reaches here, it's a fallback.
      throw new Error(t('zod.password.minLength', 'Password must meet all strength requirements.'));
    }

    const storedUserJSON = localStorage.getItem('simultradex_user');
    let storedUser: User | null = null;
    if (storedUserJSON) {
        try {
            storedUser = JSON.parse(storedUserJSON) as User;
        } catch(e) {
            console.error("Error parsing stored user during login:", e);
            // Potentially clear corrupted data
            localStorage.removeItem('simultradex_user');
        }
    }
    
    // In a multi-user mock scenario, you'd search an array of users.
    // For this single-user localStorage mock, we check if the stored user's email matches.
    if (storedUser && storedUser.email === email && storedUser.password === pass) {
      setUser(storedUser);
      // persistUser(storedUser); // Already persisted, no need to call again if no change
      router.push('/dashboard');
    } else {
      throw new Error(t('login.error.invalidCredentials', 'Invalid email or password.'));
    }
  }, [router, t]);

  const signup = useCallback(async (email: string, pass: string) => {
    // Password strength is already validated by Zod in SignupForm.
    // If this function is called, 'pass' is assumed to be strong.
    // Here, we simulate checking if the email is already taken.
    const storedUserJSON = localStorage.getItem('simultradex_user');
    if (storedUserJSON) {
        try {
            const existingUser = JSON.parse(storedUserJSON) as User;
            if (existingUser.email === email) {
                throw new Error(t('signup.error.emailTaken', 'This email is already registered.'));
            }
        } catch (e) {
            console.error("Error parsing stored user during signup:", e);
             // Potentially clear corrupted data if it prevents signup
            localStorage.removeItem('simultradex_user');
        }
    }

    const newUser: User = { 
      id: 'mock-user-id-' + Date.now(), 
      email, 
      password: pass // Store plain text password for mock
    };
    setUser(newUser);
    persistUser(newUser);
    router.push('/dashboard');
  }, [router, t]);

  const logout = useCallback(() => {
    setUser(null);
    setIsConnectedToBinance(false);
    persistUser(null); // This clears the "remember me" state
    router.push('/login');
  }, [router]);

  const updateApiKey = useCallback((apiKey: string, apiSecret: string) => {
    setUser(currentUser => {
      if (currentUser) {
        const updatedUser = { ...currentUser, binanceApiKey: apiKey, binanceApiSecret: apiSecret };
        persistUser(updatedUser);
        if (apiKey && apiSecret && apiKey !== 'test_key_invalid') { 
          setIsConnectedToBinance(true);
        } else {
          setIsConnectedToBinance(false);
        }
        return updatedUser;
      }
      return null;
    });
  }, []);


  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateApiKey, isConnectedToBinance }}>
      {children}
    </AuthContext.Provider>
  );
};

