
'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language'; // For translation of error messages

// Define custom error for specific scenarios
export class EmailTakenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailTakenError";
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, EmailTakenError.prototype);
  }
}

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
  const { translations } = useLanguage(); 
  const t = (key: string, fallback?: string) => translations[key] || fallback || key;


  useEffect(() => {
    const storedUser = localStorage.getItem('simultradex_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        if (parsedUser.binanceApiKey && parsedUser.binanceApiSecret) {
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
    if (!isStrongPassword(pass)) {
      throw new Error(t('login.error.invalidCredentials', 'Invalid email or password.')); // Generic message for login
    }

    const storedUserJSON = localStorage.getItem('simultradex_user');
    let storedUser: User | null = null;
    if (storedUserJSON) {
        try {
            storedUser = JSON.parse(storedUserJSON) as User;
        } catch(e) {
            console.error("Error parsing stored user during login:", e);
            localStorage.removeItem('simultradex_user');
        }
    }
    
    if (storedUser && storedUser.email === email && storedUser.password === pass) {
      setUser(storedUser);
      router.push('/dashboard');
    } else {
      throw new Error(t('login.error.invalidCredentials', 'Invalid email or password.'));
    }
  }, [router, t]);

  const signup = useCallback(async (email: string, pass: string) => {
    // Password strength is validated by Zod in SignupForm before this is called.
    const storedUserJSON = localStorage.getItem('simultradex_user');
    if (storedUserJSON) {
        try {
            const existingUser = JSON.parse(storedUserJSON) as User;
            if (existingUser.email === email) {
                throw new EmailTakenError(t('signup.error.emailTaken', 'This email is already registered.'));
            }
        } catch (e) {
            console.error("Error parsing stored user during signup:", e);
            localStorage.removeItem('simultradex_user');
        }
    }

    const newUser: User = { 
      id: 'mock-user-id-' + Date.now(), 
      email, 
      password: pass 
    };
    setUser(newUser);
    persistUser(newUser);
    router.push('/dashboard');
  }, [router, t]);

  const logout = useCallback(() => {
    setUser(null);
    setIsConnectedToBinance(false);
    persistUser(null); 
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

