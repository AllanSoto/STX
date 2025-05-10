'use client';

import { useContext } from 'react';
import type { LanguageContextType } from '@/providers/language-provider'; // Import type if needed, or define inline
import { LanguageContext } from '@/providers/language-provider';

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
