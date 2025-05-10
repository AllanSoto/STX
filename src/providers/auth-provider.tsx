'use client';

import type { User } from '@/lib/types';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>; // pass is unused for mock
  signup: (email: string, pass: string) => Promise<void>; // pass is unused for mock
  logout: () => void;
  updateApiKey: (apiKey: string, apiSecret: string) => void;
  isConnectedToBinance: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectedToBinance, setIsConnectedToBinance] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('simultradex_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as User;
      setUser(parsedUser);
      if (parsedUser.binanceApiKey && parsedUser.binanceApiSecret) {
        // Mock successful connection
        setIsConnectedToBinance(true);
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

  const login = useCallback(async (email: string, _pass: string) => {
    // Mock login
    const mockUser: User = { id: 'mock-user-id', email };
    setUser(mockUser);
    persistUser(mockUser);
    router.push('/dashboard');
  }, [router]);

  const signup = useCallback(async (email: string, _pass: string) => {
    // Mock signup
    const mockUser: User = { id: 'mock-user-id-' + Date.now(), email };
    setUser(mockUser);
    persistUser(mockUser);
    router.push('/dashboard');
  }, [router]);

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
        // Simulate API connection check
        if (apiKey && apiSecret) { // Basic check, real check would be an API call
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
