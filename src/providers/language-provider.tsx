// src/providers/language-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LANGUAGES } from '@/lib/constants';

export type LanguageCode = typeof LANGUAGES[number]['code'];

// Trimmed down translations, removing Firebase/auth specific keys
const translationsData: Record<LanguageCode, Record<string, string>> = {
  en: {
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Loading SimulTradex...',
    'app.redirecting': 'Redirecting...',
    'settings.title': 'Settings',
    'settings.accountSettings': 'Application Settings', 
    'settings.language': 'Language',
    'dashboard.title': 'Dashboard',
    'dashboard.marketOverview': 'Market Overview',
    'dashboard.loadingPrices': 'Loading live prices...',
    'dashboard.cryptoCard.trend.notAvailable': "Trend N/A",
    'dashboard.orderOpportunitySimulator.title': 'Order & Opportunity Simulator',
    'dashboard.orderOpportunitySimulator.description': 'Simulate an exchange and see potential sell opportunities at incremental profit percentages.',
    'dashboard.orderOpportunitySimulator.operationPairLabel': 'Trading Pair',
    'dashboard.orderOpportunitySimulator.amountToSpendInQuoteLabel': 'Amount to Spend ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceOfBaseInQuoteLabel': 'Purchase Price of {baseCurrency} (in {quoteCurrency})',
    'dashboard.orderOpportunitySimulator.exchangedCryptoLabel': 'Exchanged Crypto ({crypto})',
    'dashboard.orderOpportunitySimulator.selectPairPlaceholder': 'Select Trading Pair',
    'dashboard.orderOpportunitySimulator.table.header.operation': 'Operation',
    'dashboard.orderOpportunitySimulator.table.header.amountToTransact': 'Amount ({currency1})',
    'dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay': 'Market Price ({currency2}/{currency1})',
    'dashboard.orderOpportunitySimulator.table.header.amountExchanged': 'Exchanged ({currency2})',
    'dashboard.orderOpportunitySimulator.table.header.commissionDisplay': 'Commission ({currency})',
    'dashboard.orderOpportunitySimulator.table.header.netProfitDisplay': 'Net Profit ({currency})',
    'dashboard.orderOpportunitySimulator.table.header.actions': 'Actions',
    'dashboard.orderOpportunitySimulator.buyOperation': 'Buy {targetCrypto} with {baseCurrency}',
    'dashboard.orderOpportunitySimulator.sellOperationPerc': 'Sell {targetCrypto} (+{perc}%)',
    'dashboard.orderOpportunitySimulator.priceUnavailable': 'Price N/A',
    'dashboard.orderOpportunitySimulator.invalidPurchasePrice': 'Invalid Purchase Price',
    'dashboard.orderOpportunitySimulator.calculationError': 'Calculation Error',
    'dashboard.orderOpportunitySimulator.calculating': 'Calculating...',
    'dashboard.orderOpportunitySimulator.enterValuesPromptFull': 'Please select pair, enter amount, and purchase price to see simulation.',
    'dashboard.orderOpportunitySimulator.commissionInfo': 'Commission is {rate}% on the transaction value in {quote_currency}.',
    'dashboard.connectionStatus.title': 'Connection Issue',
    'dashboard.connectionStatus.noFeed': 'Currently not receiving live price updates. Attempting to connect...',
    'dashboard.connectionStatus.fallbackTitle': 'Using Fallback Connection',
    'dashboard.connectionStatus.restFallbackActive': 'WebSocket connection failed. Using periodic REST API updates for prices.',
    'dashboard.api.binance.fetchError': 'Failed to fetch prices from Binance: {status}',
    'dashboard.api.binance.errorTitle': 'Price Fetch Error (Binance)',
    'dashboard.api.binance.unknownError': 'Could not fetch live prices from Binance.',
    'dashboard.websocket.errorTitle': 'WebSocket Error',
    'dashboard.websocket.errorDescriptionBinanceFallback': 'Binance WebSocket failed. Using REST fallback.',
    'history.page.title': "Order History",
    'history.menuItem': 'Order History',
    'zod.orderOpportunity.selectPair': 'Please select a trading pair.',
    'zod.orderOpportunity.positiveInputAmount': 'Amount must be a positive number.',
    'zod.orderOpportunity.purchasePriceUsdtPositive': 'Purchase price must be a positive number.',
    'toaster.notificationsLabel': 'Notifications (F8)',
    'sidebar.rail.toggleLabel': 'Toggle sidebar',
    'sidebar.rail.toggleTitle': 'Toggle sidebar',
  },
  es: { 
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Cargando SimulTradex...',
    'app.redirecting': 'Redirigiendo...',
    'settings.title': 'Configuración',
    'settings.accountSettings': 'Configuración de Aplicación', 
    'settings.language': 'Idioma',
    'dashboard.title': 'Tablero',
    'dashboard.marketOverview': 'Resumen del Mercado',
    'dashboard.loadingPrices': 'Cargando precios en vivo...',
    'dashboard.cryptoCard.trend.notAvailable': "Tendencia N/A",
    'dashboard.orderOpportunitySimulator.title': 'Simulador de Órdenes y Oportunidades',
    'dashboard.orderOpportunitySimulator.description': 'Simula un intercambio y visualiza oportunidades de venta potenciales con porcentajes de ganancia incrementales.',
    'dashboard.orderOpportunitySimulator.operationPairLabel': 'Par de Trading',
    'dashboard.orderOpportunitySimulator.amountToSpendInQuoteLabel': 'Cantidad a Gastar ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceOfBaseInQuoteLabel': 'Precio de Compra de {baseCurrency} (en {quoteCurrency})',
    'dashboard.orderOpportunitySimulator.exchangedCryptoLabel': 'Cripto Intercambiado ({crypto})',
    'dashboard.orderOpportunitySimulator.selectPairPlaceholder': 'Selecciona Par de Trading',
    'dashboard.orderOpportunitySimulator.table.header.operation': 'Operación',
    'dashboard.orderOpportunitySimulator.table.header.amountToTransact': 'Cantidad ({currency1})',
    'dashboard.orderOpportunitySimulator.table.header.marketPriceDisplay': 'Precio de Mercado ({currency2}/{currency1})',
    'dashboard.orderOpportunitySimulator.table.header.amountExchanged': 'Intercambiado ({currency2})',
    'dashboard.orderOpportunitySimulator.table.header.commissionDisplay': 'Comisión ({currency})',
    'dashboard.orderOpportunitySimulator.table.header.netProfitDisplay': 'Ganancia Neta ({currency})',
    'dashboard.orderOpportunitySimulator.table.header.actions': 'Acciones',
    'dashboard.orderOpportunitySimulator.buyOperation': 'Comprar {targetCrypto} con {baseCurrency}',
    'dashboard.orderOpportunitySimulator.sellOperationPerc': 'Vender {targetCrypto} (+{perc}%)',
    'dashboard.orderOpportunitySimulator.priceUnavailable': 'Precio N/D',
    'dashboard.orderOpportunitySimulator.invalidPurchasePrice': 'Precio de Compra Inválido',
    'dashboard.orderOpportunitySimulator.calculationError': 'Error de Cálculo',
    'dashboard.orderOpportunitySimulator.calculating': 'Calculando...',
    'dashboard.orderOpportunitySimulator.enterValuesPromptFull': 'Por favor, selecciona un par, ingresa el monto y el precio de compra para ver la simulación.',
    'dashboard.orderOpportunitySimulator.commissionInfo': 'La comisión es del {rate}% sobre el valor de la transacción en {quote_currency}.',
    'dashboard.connectionStatus.title': 'Problema de Conexión',
    'dashboard.connectionStatus.noFeed': 'Actualmente no se reciben actualizaciones de precios en vivo. Intentando conectar...',
    'dashboard.connectionStatus.fallbackTitle': 'Usando Conexión de Respaldo',
    'dashboard.connectionStatus.restFallbackActive': 'Falló la conexión WebSocket. Usando actualizaciones periódicas de API REST para precios.',
    'dashboard.api.binance.fetchError': 'Error al obtener precios de Binance: {status}',
    'dashboard.api.binance.errorTitle': 'Error al Obtener Precios (Binance)',
    'dashboard.api.binance.unknownError': 'No se pudieron obtener los precios en vivo de Binance.',
    'dashboard.websocket.errorTitle': 'Error de WebSocket',
    'dashboard.websocket.errorDescriptionBinanceFallback': 'Falló WebSocket de Binance. Usando API REST de respaldo.',
    'history.page.title': "Historial de Órdenes",
    'history.menuItem': 'Historial de Órdenes',
    'zod.orderOpportunity.selectPair': 'Por favor selecciona un par de trading.',
    'zod.orderOpportunity.positiveInputAmount': 'El monto debe ser un número positivo.',
    'zod.orderOpportunity.purchasePriceUsdtPositive': 'El precio de compra debe ser un número positivo.',
    'toaster.notificationsLabel': 'Notificaciones (F8)',
    'sidebar.rail.toggleLabel': 'Activar o desactivar la barra lateral',
    'sidebar.rail.toggleTitle': 'Activar o desactivar la barra lateral',
  },
  fr: { 
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Chargement de SimulTradex...',
    'app.redirecting': 'Redirection...',
    'settings.title': 'Paramètres',
    'settings.accountSettings': 'Paramètres de l\'Application', 
    'settings.language': 'Langue',
    'dashboard.title': 'Tableau de Bord',
    'dashboard.marketOverview': 'Aperçu du Marché',
    'toaster.notificationsLabel': 'Notifications (F8)',
    'sidebar.rail.toggleLabel': 'Basculer la barre latérale',
    'sidebar.rail.toggleTitle': 'Basculer la barre latérale',
  },
  hi: { 
    'app.name': 'सिमुलट्रेडेक्स',
    'app.loadingMessage': 'सिमुलट्रेडेक्स लोड हो रहा है...',
    'app.redirecting': 'पुनर्निर्देशित किया जा रहा है...',
    'settings.title': 'सेटिंग्स',
    'settings.accountSettings': 'एप्लिकेशन सेटिंग्स', 
    'settings.language': 'भाषा',
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.marketOverview': 'बाजार अवलोकन',
    'toaster.notificationsLabel': 'सूचनाएं (F8)',
    'sidebar.rail.toggleLabel': 'साइडबार टॉगल करें',
    'sidebar.rail.toggleTitle': 'साइडबार टॉगल करें',
  },
  zh: { 
    'app.name': 'SimulTradex',
    'app.loadingMessage': '正在加载SimulTradex...',
    'app.redirecting': '正在重定向...',
    'settings.title': '设置',
    'settings.accountSettings': '应用程序设置', 
    'settings.language': '语言',
    'dashboard.title': '仪表板',
    'dashboard.marketOverview': '市场概览',
    'toaster.notificationsLabel': '通知 (F8)',
    'sidebar.rail.toggleLabel': '切换侧边栏',
    'sidebar.rail.toggleTitle': '切换侧边栏',
  }
};

const DEFAULT_LANGUAGE: LanguageCode = 'es';

export interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  translations: Record<string, string>;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  hydrated: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState<Record<string, string>>(
    translationsData[DEFAULT_LANGUAGE]
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('simultradex_language') as LanguageCode | null;
    const initialLang = storedLanguage && translationsData[storedLanguage] ? storedLanguage : DEFAULT_LANGUAGE;
    
    setLanguage(initialLang);
    setTranslations(translationsData[initialLang]);
    document.documentElement.lang = initialLang;
    
    setHydrated(true);
  }, []);

  const setLanguageCallback = useCallback((langCode: LanguageCode) => {
    if (translationsData[langCode]) {
      setLanguage(langCode);
      setTranslations(translationsData[langCode]);
      localStorage.setItem('simultradex_language', langCode);
      document.documentElement.lang = langCode;
    }
  }, []);

  const t = useCallback((key: string, fallback: string = key, vars?: Record<string, string | number>) => {
    let msg = hydrated ? (translations[key] || fallback) : fallback;
    
    if (vars && typeof msg === 'string') {
      Object.keys(vars).forEach(varKey => {
        msg = (msg as string).replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return String(msg || key);
  }, [translations, hydrated]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage: setLanguageCallback,
    translations,
    t,
    hydrated
  }), [language, setLanguageCallback, translations, t, hydrated]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
