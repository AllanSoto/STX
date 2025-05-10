
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES } from '@/lib/constants';

export type LanguageCode = typeof LANGUAGES[number]['code'];

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  translations: Record<string, string>;
}

// Define basic translations
// NOTE: New keys have been added with English translations.
// For other languages (es, fr, hi, zh), these new keys will need to be translated and added.
const translationsData: Record<LanguageCode, Record<string, string>> = {
  en: {
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Loading SimulTradex...',
    'settings.myAccount': 'My Account',
    'settings.accountSettings': 'Account Settings',
    'settings.language': 'Language',
    'settings.logout': 'Log out',
    'dashboard.title': 'Dashboard',
    'dashboard.marketOverview': 'Market Overview',
    'dashboard.orderSimulator': 'Order Simulator',
    'dashboard.opportunitySimulator': 'Opportunity Simulator',
    'login.title': 'Log In',
    'login.description': 'Log in to your account',
    'login.emailLabel': 'Email',
    'login.emailPlaceholder': 'you@example.com',
    'login.passwordLabel': 'Password',
    'login.submitButton': 'Log In',
    'login.signupPrompt': "Don't have an account?",
    'login.signupLink': 'Sign up',
    'login.error.invalidCredentials': 'Invalid email or password.',
    'signup.title': 'Sign Up',
    'signup.description': 'Create your account',
    'signup.emailLabel': 'Email',
    'signup.emailPlaceholder': 'you@example.com',
    'signup.passwordLabel': 'Password',
    'signup.confirmPasswordLabel': 'Confirm Password',
    'signup.submitButton': 'Sign Up',
    'signup.loginPrompt': 'Already have an account?',
    'signup.loginLink': 'Log in',
    'signup.error.unknown': 'An unknown error occurred.',

    'account.apiKey.title': "Binance API Connection",
    'account.apiKey.description': "Connect your Binance account to fetch real-time data. Your keys are stored locally (mock).",
    'account.apiKey.connectedStatus': "Connected to Binance API.",
    'account.apiKey.disconnectButton': "Disconnect",
    'account.apiKey.apiKeyLabel': "API Key",
    'account.apiKey.apiKeyPlaceholder': "Your Binance API Key",
    'account.apiKey.apiSecretLabel': "API Secret",
    'account.apiKey.apiSecretPlaceholder': "Your Binance API Secret",
    'account.apiKey.connectButton': "Connect to Binance",
    'account.apiKey.error.connectionFailed': "Connection failed: Invalid API Key or Secret.",
    'account.apiKey.toast.connectionFailedTitle': "API Connection Failed",
    'account.apiKey.toast.connectionFailedDescription': "Invalid API Key or Secret.",
    'account.apiKey.toast.connectedTitle': "API Connected",
    'account.apiKey.toast.connectedDescription': "Successfully connected to Binance API.",

    'account.passwordChange.title': "Change Password",
    'account.passwordChange.description': "Update your account password.",
    'account.passwordChange.currentPasswordLabel': "Current Password",
    'account.passwordChange.newPasswordLabel': "New Password",
    'account.passwordChange.confirmNewPasswordLabel': "Confirm New Password",
    'account.passwordChange.passwordPlaceholder': "••••••••",
    'account.passwordChange.submitButton': "Change Password",
    'account.passwordChange.toast.changedTitle': "Password Changed",
    'account.passwordChange.toast.changedDescription': "Your password has been successfully updated.",
    'account.passwordChange.toast.failedTitle': "Password Change Failed",
    'account.passwordChange.toast.failedDescriptionIncorrect': "Incorrect current password.",

    'account.page.title': "Account Settings",
    'account.page.userInfoTitle': "User Information",
    'account.page.emailLabel': "Email:",

    'dashboard.cryptoCard.tooltip.reason': "Reason:",
    'dashboard.cryptoCard.tooltip.confidence': "Confidence:",
    'dashboard.cryptoCard.trend.upward': "Upward trend",
    'dashboard.cryptoCard.trend.downward': "Downward trend",
    'dashboard.cryptoCard.trend.sideways': "Sideways trend",
    'dashboard.cryptoCard.trend.notAvailable': "Trend N/A",

    'dashboard.opportunityList.title': "Opportunity Simulator",
    'dashboard.opportunityList.description': "Potential trade opportunities based on current prices and target profit percentages.",
    'dashboard.opportunityList.table.header.crypto': "Crypto",
    'dashboard.opportunityList.table.header.currentPrice': "Current Price",
    'dashboard.opportunityList.table.header.targetSell': "Target Sell (+Profit)",
    'dashboard.opportunityList.table.header.potentialGain': "Potential Gain",
    'dashboard.opportunityList.emptyMessage': "No opportunities to display currently, or prices are still loading.",

    'dashboard.orderSimulator.title': "Order Simulator",
    'dashboard.orderSimulator.description': "Simulate a buy and sell order to estimate potential profit or loss. Input quantity, buy price, and sell price. Current market prices are pre-filled for buy price.",
    'dashboard.orderSimulator.cryptoLabel': "Cryptocurrency",
    'dashboard.orderSimulator.selectPlaceholder': "Select a crypto",
    'dashboard.orderSimulator.tradingPairDesc': "Trading Pair: {symbol}/{quoteCurrency}",
    'dashboard.orderSimulator.quantityLabel': "Quantity ({symbol})",
    'dashboard.orderSimulator.quantityLabelNoSymbol': "Quantity",
    'dashboard.orderSimulator.buyPriceLabel': "Buy Price ({quoteCurrency} per unit)",
    'dashboard.orderSimulator.sellPriceLabel': "Sell Price ({quoteCurrency} per unit)",
    'dashboard.orderSimulator.commissionDesc': "A commission of {rate}% will be applied to both buy and sell transactions.",
    'dashboard.orderSimulator.submitButton': "Simulate Trade",
    'dashboard.orderSimulator.toast.errorTitle': "Simulation Error",
    'dashboard.orderSimulator.toast.errorSellPrice': "Sell price must be greater than buy price.",
    'dashboard.orderSimulator.toast.completeTitle': "Simulation Complete",
    'dashboard.orderSimulator.toast.completeDescription': "Simulated trade for {quantity} {symbol} processed.",
    'dashboard.orderSimulator.result.title': "Simulation Result for {quantity} {symbol}",
    'dashboard.orderSimulator.result.grossProfit': "Gross Profit:",
    'dashboard.orderSimulator.result.totalCommission': "Total Commission:",
    'dashboard.orderSimulator.result.netProfitLoss': "Net Profit / Loss:",
    
    'zod.email.invalid': 'Invalid email address.',
    'zod.password.required': 'Password is required.',
    'zod.password.minLength': 'Password must be at least 8 characters.',
    'zod.password.lowercase': 'Password must contain at least one lowercase letter.',
    'zod.password.uppercase': 'Password must contain at least one uppercase letter.',
    'zod.password.number': 'Password must contain at least one number.',
    'zod.password.specialChar': 'Password must contain at least one special character.',
    'zod.password.confirmMatch': "Passwords don't match.",
    'zod.apiKey.short': 'API Key seems too short.',
    'zod.apiSecret.short': 'API Secret seems too short.',
    'zod.password.currentRequired': 'Current password is required.',
    'zod.password.newMinLength': 'Password must be at least 8 characters.', // same as zod.password.minLength but contextually different
    'zod.password.newLowercase': 'Password must contain at least one lowercase letter.', // same as zod.password.lowercase
    'zod.password.newUppercase': 'Password must contain at least one uppercase letter.', // same as zod.password.uppercase
    'zod.password.newNumber': 'Password must contain at least one number.', // same as zod.password.number
    'zod.password.newSpecialChar': 'Password must contain at least one special character.', // same as zod.password.specialChar
    'zod.password.newConfirmMatch': "New passwords don't match.", // same as zod.password.confirmMatch
    'zod.order.selectCrypto': 'Please select a cryptocurrency.',
    'zod.order.positiveNumber': 'Must be a positive number.',
  },
  es: {
    'app.name': 'SimulTradex',
    'settings.myAccount': 'Mi Cuenta',
    'settings.accountSettings': 'Configuración de Cuenta',
    'settings.language': 'Idioma',
    'settings.logout': 'Cerrar Sesión',
    'dashboard.title': 'Tablero',
    'dashboard.marketOverview': 'Resumen del Mercado',
    'dashboard.orderSimulator': 'Simulador de Órdenes',
    'dashboard.opportunitySimulator': 'Simulador de Oportunidades',
    'login.title': 'Iniciar Sesión',
    'login.description': 'Inicia sesión en tu cuenta',
    'login.emailLabel': 'Correo Electrónico',
    'login.emailPlaceholder': 'tu@ejemplo.com',
    'login.passwordLabel': 'Contraseña',
    'login.submitButton': 'Iniciar Sesión',
    'login.signupPrompt': '¿No tienes una cuenta?',
    'login.signupLink': 'Regístrate',
    'signup.title': 'Crear Cuenta',
    'signup.description': 'Crea tu cuenta',
    'signup.emailLabel': 'Correo Electrónico',
    'signup.emailPlaceholder': 'tu@ejemplo.com',
    'signup.passwordLabel': 'Contraseña',
    'signup.confirmPasswordLabel': 'Confirmar Contraseña',
    'signup.submitButton': 'Crear Cuenta',
    'signup.loginPrompt': '¿Ya tienes una cuenta?',
    'signup.loginLink': 'Iniciar Sesión',
    // New keys need to be added here for Spanish
  },
  fr: {
    'app.name': 'SimulTradex',
    'settings.myAccount': 'Mon Compte',
    'settings.accountSettings': 'Paramètres du Compte',
    'settings.language': 'Langue',
    'settings.logout': 'Se Déconnecter',
    'dashboard.title': 'Tableau de Bord',
    'dashboard.marketOverview': 'Aperçu du Marché',
    'dashboard.orderSimulator': 'Simulateur d\'Ordres',
    'dashboard.opportunitySimulator': 'Simulateur d\'Opportunités',
    'login.title': 'Se Connecter',
    'login.description': 'Connectez-vous à votre compte',
    'login.emailLabel': 'E-mail',
    'login.emailPlaceholder': 'vous@example.com',
    'login.passwordLabel': 'Mot de passe',
    'login.submitButton': 'Se Connecter',
    'login.signupPrompt': 'Vous n\'avez pas de compte ?',
    'login.signupLink': 'S\'inscrire',
    'signup.title': 'S\'inscrire',
    'signup.description': 'Créez votre compte',
    'signup.emailLabel': 'E-mail',
    'signup.emailPlaceholder': 'vous@example.com',
    'signup.passwordLabel': 'Mot de passe',
    'signup.confirmPasswordLabel': 'Confirmer le mot de passe',
    'signup.submitButton': 'S\'inscrire',
    'signup.loginPrompt': 'Vous avez déjà un compte ?',
    'signup.loginLink': 'Se Connecter',
    // New keys need to be added here for French
  },
  hi: {
    'app.name': 'सिमुलट्रेडेक्स',
    'settings.myAccount': 'मेरा खाता',
    'settings.accountSettings': 'खाता सेटिंग्स',
    'settings.language': 'भाषा',
    'settings.logout': 'लॉग आउट करें',
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.marketOverview': 'बाज़ार अवलोकन',
    'dashboard.orderSimulator': 'ऑर्डर सिम्युलेटर',
    'dashboard.opportunitySimulator': 'अवसर सिम्युलेटर',
    'login.title': 'लॉग इन करें',
    'login.description': 'अपने खाते में लॉग इन करें',
    'login.emailLabel': 'ईमेल',
    'login.emailPlaceholder': 'aap@udaharan.com',
    'login.passwordLabel': 'पासवर्ड',
    'login.submitButton': 'लॉग इन करें',
    'login.signupPrompt': 'खाता नहीं है?',
    'login.signupLink': 'साइन अप करें',
    'signup.title': 'साइन अप करें',
    'signup.description': 'अपना खाता बनाएं',
    'signup.emailLabel': 'ईमेल',
    'signup.emailPlaceholder': 'aap@udaharan.com',
    'signup.passwordLabel': 'पासवर्ड',
    'signup.confirmPasswordLabel': 'पासवर्ड की पुष्टि करें',
    'signup.submitButton': 'साइन अप करें',
    'signup.loginPrompt': 'पहले से ही एक खाता है?',
    'signup.loginLink': 'लॉग इन करें',
    // New keys need to be added here for Hindi
  },
  zh: {
    'app.name': 'SimulTradex',
    'settings.myAccount': '我的账户',
    'settings.accountSettings': '账户设置',
    'settings.language': '语言',
    'settings.logout': '登出',
    'dashboard.title': '仪表板',
    'dashboard.marketOverview': '市场概览',
    'dashboard.orderSimulator': '订单模拟器',
    'dashboard.opportunitySimulator': '机会模拟器',
    'login.title': '登录',
    'login.description': '登录您的帐户',
    'login.emailLabel': '电子邮件',
    'login.emailPlaceholder': 'ni@example.com',
    'login.passwordLabel': '密码',
    'login.submitButton': '登录',
    'login.signupPrompt': '还没有账户？',
    'login.signupLink': '注册',
    'signup.title': '注册',
    'signup.description': '创建您的账户',
    'signup.emailLabel': '电子邮件',
    'signup.emailPlaceholder': 'ni@example.com',
    'signup.passwordLabel': '密码',
    'signup.confirmPasswordLabel': '确认密码',
    'signup.submitButton': '注册',
    'signup.loginPrompt': '已经有账户了？',
    'signup.loginLink': '登录',
    // New keys need to be added here for Chinese
  }
};

const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setCurrentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, string>>(
    translationsData[DEFAULT_LANGUAGE]
  );

  useEffect(() => {
    const storedLanguage = localStorage.getItem('simultradex_language') as LanguageCode | null;
    if (storedLanguage && translationsData[storedLanguage]) {
      setCurrentLanguage(storedLanguage);
      setTranslations(translationsData[storedLanguage]);
    } else {
      setTranslations(translationsData[DEFAULT_LANGUAGE]);
       // Optionally set default in localStorage if not found
      localStorage.setItem('simultradex_language', DEFAULT_LANGUAGE);
    }
  }, []);

  const setLanguage = useCallback((langCode: LanguageCode) => {
    if (translationsData[langCode]) {
      setCurrentLanguage(langCode);
      setTranslations(translationsData[langCode]);
      localStorage.setItem('simultradex_language', langCode);
    } else {
      console.warn(`Language code ${langCode} not found in translations. Falling back to default.`);
      setCurrentLanguage(DEFAULT_LANGUAGE);
      setTranslations(translationsData[DEFAULT_LANGUAGE]);
      localStorage.setItem('simultradex_language', DEFAULT_LANGUAGE);
    }
  }, []);
  
  useEffect(() => {
    // Dynamically update html lang attribute
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

    