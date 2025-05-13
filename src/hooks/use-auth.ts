// src/hooks/use-auth.ts
'use client';

import { useContext } from 'react';
import type { AuthContextType } from '@/providers/auth-provider';
import { AuthContext } from '@/providers/auth-provider';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
