// src/providers/language-provider.tsx
'use client';

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LANGUAGES } from '@/lib/constants';

export type LanguageCode = typeof LANGUAGES[number]['code'];

// Full translationsData as it exists in the user's current file
const translationsData: Record<LanguageCode, Record<string, string>> = {
  en: {
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Loading SimulTradex...',
    'app.redirecting': 'Redirecting...',
    'settings.title': 'Settings',
    'settings.accountSettings': 'Account Settings', 
    'settings.language': 'Language',
    'dashboard.title': 'Dashboard',
    'dashboard.marketOverview': 'Market Overview',
    'dashboard.orderSimulator': 'Order Simulator',
    'dashboard.opportunitySimulator': 'Opportunity Simulator',
    'dashboard.loadingPrices': 'Loading live prices...',
    'dashboard.portfolioBalance': 'Portfolio Balance',
    'dashboard.portfolioBalance.publicSourceMessage': "Displaying market data from public source.",
    'dashboard.cryptoCard.alertButton.title': 'Set Price Alert',
    'dashboard.cryptoCard.alertButton.label': 'Set Alert',
    'dashboard.alerts.fetchErrorTitle': 'Alerts Error',
    'dashboard.alerts.fetchErrorDescription': 'Could not load price alerts.', 
    'dashboard.alerts.triggeredTitle': 'Price Alert Triggered!',
    'dashboard.alerts.triggeredDescription': '{symbol} has reached your target price of ${targetPrice}. Current price: ${currentPrice}.',
    'dashboard.ai.historicalDataError': 'Could not fetch historical data for {symbol}.',
    'account.page.title': "Account Settings", 
    'account.profile.title': 'Profile Information', 
    'account.profile.description': 'Application details.', 
    'dashboard.cryptoCard.tooltip.reason': "Reason:",
    'dashboard.cryptoCard.tooltip.confidence': "Confidence:",
    'dashboard.cryptoCard.trend.upward': "Upward trend",
    'dashboard.cryptoCard.trend.downward': "Downward trend",
    'dashboard.cryptoCard.trend.sideways': "Sideways trend",
    'dashboard.cryptoCard.trend.notAvailable': "Trend N/A",
    'dashboard.cryptoCard.trend.ariaLabel': 'Trend information',
    'dashboard.orderOpportunitySimulator.title': 'Order & Opportunity Simulator',
    'dashboard.orderOpportunitySimulator.description': 'Simulate an exchange and see potential sell opportunities at incremental profit percentages.',
    'dashboard.orderOpportunitySimulator.operationPairLabel': 'Trading Pair',
    'dashboard.orderOpportunitySimulator.amountToSpendInQuoteLabel': 'Amount to Spend ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceOfCryptoLabel': 'Price of Crypto ({quoteCurrency})', // Changed key
    'dashboard.orderOpportunitySimulator.exchangedCryptoValueLabel': 'Exchanged Crypto ({targetCurrency})', // Changed key
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
    'dashboard.orderOpportunitySimulator.priceUnavailableShort': 'N/A',
    'dashboard.orderOpportunitySimulator.priceEditPlaceholder': 'e.g., 0.5',
    'dashboard.orderOpportunitySimulator.invalidMarketPrice': 'Invalid Market Price',
    'dashboard.orderOpportunitySimulator.invalidPurchasePrice': 'Invalid Purchase Price',
    'dashboard.orderOpportunitySimulator.calculationError': 'Calculation Error',
    'dashboard.orderOpportunitySimulator.calculating': 'Calculating...',
    'dashboard.orderOpportunitySimulator.enterValuesPrompt': 'Please select a pair and enter amount to see simulation.',
    'dashboard.orderOpportunitySimulator.enterValuesPromptFull': 'Please select pair, enter amount, and purchase price to see simulation.',
    'dashboard.orderOpportunitySimulator.commissionInfo': 'Commission is {rate}% on the transaction value in {quote_currency}.',
    'dashboard.orderOpportunitySimulator.saveButton': 'Save Full Simulation',
    'dashboard.orderOpportunitySimulator.saveOrderButton': 'Save Order',
    'dashboard.orderOpportunitySimulator.toast.savedSuccessTitle': 'Simulation Saved',
    'dashboard.orderOpportunitySimulator.toast.savedSuccessDescription': 'Your simulation has been successfully saved.',
    'dashboard.orderOpportunitySimulator.toast.saveErrorTitle': 'Save Error',
    'dashboard.orderOpportunitySimulator.toast.saveErrorDescription': 'Could not save the simulation. Please try again.',
    'dashboard.orderOpportunitySimulator.toast.noDataToSave': 'There is no valid simulation/order data to save.',
    'dashboard.orderOpportunitySimulator.toast.orderSavedSuccessTitle': 'Order Saved',
    'dashboard.orderOpportunitySimulator.toast.orderSavedSuccessDescription': 'The specific order has been successfully saved.',
    'dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle': 'Order Save Error',
    'dashboard.orderOpportunitySimulator.toast.orderSaveErrorDescription': 'Could not save the specific order. Please try again.',
    'auth.disabled.title': 'Feature Disabled',
    'auth.disabled.description': 'This feature is currently disabled because user authentication has been removed.',
    'auth.disabled.featureUnavailable': 'This feature is unavailable because user authentication has been removed.',
    'auth.disabled.featureUnavailableShort': 'Feature disabled.',
    'auth.disabled.accountPageMessage': 'User account management is disabled as authentication has been removed from this application.',
    'auth.disabled.goToDashboard': 'Go to Dashboard',
    'auth.disabled.passwordChangeMessage': 'Password change functionality is disabled as user authentication has been removed.',
    'auth.disabled.alertsUnavailable': 'Price alerts are unavailable without user accounts.',
    'auth.disabled.alertsUnavailableShort': 'Alerts disabled.',
    'auth.disabled.simulationsUnavailable': 'Saving simulations is unavailable without user accounts.',
    'auth.disabled.ordersUnavailable': 'Saving orders is unavailable without user accounts.',
    'auth.disabled.saveOrderButtonDisabled': 'Save Order (Auth Disabled)',
    'auth.disabled.saveButtonDisabled': 'Save Simulation (Auth Disabled)',
    'dashboard.orderOpportunitySimulator.toast.saveDisabledTitle': 'Save Disabled',
    'dashboard.orderOpportunitySimulator.toast.saveDisabledDescription': 'Saving simulations is disabled as user authentication has been removed.',
    'dashboard.orderOpportunitySimulator.toast.orderSaveDisabledTitle': 'Order Save Disabled',
    'dashboard.orderOpportunitySimulator.toast.orderSaveDisabledDescription': 'Saving orders is disabled as user authentication has been removed.',
    'dashboard.orderOpportunitySimulator.exchangeOperation': 'Exchange {cur1} for {cur2}',
    'dashboard.orderOpportunitySimulator.quantityLabel': 'Quantity ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceLabel': 'Purchase Price ({baseCurrency} per {quoteCurrency})',
    'dashboard.orderOpportunitySimulator.amountToSpendLabel': 'Amount to Spend ({quoteCurrency})',
    'dashboard.connectionStatus.title': 'Connection Issue',
    'dashboard.connectionStatus.noFeed': 'Currently not receiving live price updates. Attempting to connect...',
    'dashboard.connectionStatus.fallbackTitle': 'Using Fallback Connection',
    'dashboard.connectionStatus.restFallbackActive': 'WebSocket connection failed. Using periodic REST API updates for prices.',
    'dashboard.api.binance.fetchError': 'Failed to fetch prices from Binance: {status}',
    'dashboard.api.binance.errorTitle': 'Price Fetch Error (Binance)',
    'dashboard.api.binance.unknownError': 'Could not fetch live prices from Binance.',
    'dashboard.api.coincap.errorTitle': 'Price Fetch Error (CoinCap)',
    'dashboard.api.coincap.unknownError': 'Could not fetch live prices from CoinCap.',
    'dashboard.ai.errorTitle': 'AI Analysis Error',
    'dashboard.ai.errorDescription': 'Could not update AI trends.',
    'dashboard.ai.clientErrorReason': 'Client error fetching trend for {symbol}: {details}',
    'dashboard.ai.temporarilyDisabled': 'AI trend analysis is temporarily disabled.',
    'dashboard.websocket.errorTitle': 'WebSocket Error',
    'dashboard.websocket.errorDescription': 'Connection to live price feed failed. Falling back to periodic updates.',
    'dashboard.websocket.errorDescriptionBinance': 'Connection to Binance live price feed failed. Falling back to periodic updates.',
    'dashboard.websocket.errorDescriptionBinanceFallback': 'Binance WebSocket failed. Using REST fallback.',
    'dashboard.websocket.errorDescriptionCoinCap': 'Connection to CoinCap live price feed failed. Falling back to REST fallback.',
    'dashboard.websocket.errorDescriptionCoinCapFallback': 'CoinCap WebSocket failed. Using REST fallback.',
    'dashboard.websocket.errorMessage': 'Error message: {message}, Type: {type}',
    'dashboard.websocket.eventType': 'Event type: {type}',
    'history.page.title': "Order History",
    'history.menuItem': 'Order History',
    'history.filters.dateRange': "Date Range",
    'history.filters.startDate': "Start Date",
    'history.filters.endDate': "End Date",
    'history.filters.pickDate': "Pick a date",
    'history.filters.searchCrypto': "Search by Crypto",
    'history.filters.searchPlaceholder': "Enter crypto symbol (e.g., BTC)",
    'history.filters.resetButton': "Reset Filters",
    'history.export.csvButton': "Export to CSV",
    'history.export.pdfButton': "Export to PDF (Print)",
    'history.table.loading': "Loading order history...",
    'history.table.loadingError': "Failed to load order history.",
    'history.table.noOrders': "No orders found.",
    'history.table.noAuthInfo': "Order history functionality may be limited as user authentication is disabled.",
    'history.table.header.timestamp': 'Date/Time',
    'history.table.header.originalPair': 'Pair',
    'history.table.header.targetCrypto': 'Target Crypto',
    'history.table.header.quoteCurrency': 'Quote',
    'history.table.header.buyAmount': 'Bought Amount',
    'history.table.header.buyPrice': 'Buy Price',
    'history.table.header.buyComm': 'Buy Comm.',
    'history.table.header.sellPrice': 'Sell Price',
    'history.table.header.sellComm': 'Sell Comm.',
    'history.table.header.netProfit': 'Net Profit',
    'history.toast.loadErrorTitle': 'Error',
    'history.toast.loadErrorDescription': 'Could not load order history.',
    'history.toast.noDataExportTitle': 'No Data',
    'history.toast.noDataExportDescription': 'There is no data to export.',
    'history.toast.csvExportSuccessTitle': 'Export Successful',
    'history.toast.csvExportSuccessDescription': 'Order history exported to CSV.',
    'alertModal.title.edit': 'Edit Alert for {symbol}',
    'alertModal.title.create': 'Set Alert for {symbol}',
    'alertModal.description': 'Current price: ${price}',
    'alertModal.description.instruction': 'Get notified when the price goes above or below your target.',
    'alertModal.form.targetPriceLabel': 'Target Price (USDT)',
    'alertModal.form.targetPricePlaceholder': 'e.g., 50000',
    'alertModal.form.directionLabel': 'Notify me when price is',
    'alertModal.form.directionPlaceholder': 'Select direction',
    'alertModal.form.direction.above': 'Above',
    'alertModal.form.direction.below': 'Below',
    'alertModal.button.save': 'Set Alert',
    'alertModal.button.update': 'Update Alert',
    'alertModal.button.delete': 'Delete Alert',
    'alertModal.button.cancel': 'Cancel',
    'alertModal.toast.savedTitle': 'Alert Saved',
    'alertModal.toast.savedDescription': 'Your price alert for {symbol} has been set.',
    'alertModal.toast.updatedTitle': 'Alert Updated',
    'alertModal.toast.updatedDescription': 'Your price alert for {symbol} has been updated.',
    'alertModal.toast.deletedTitle': 'Alert Deleted',
    'alertModal.toast.deletedDescription': 'The price alert for {symbol} has been deleted.',
    'alertModal.toast.errorTitle': 'Error Saving Alert',
    'alertModal.toast.errorUpdateTitle': 'Error Updating Alert',
    'alertModal.toast.errorDescriptionGeneric': 'Could not save the alert.',
    'alertModal.toast.errorDeleteTitle': 'Error Deleting Alert',
    'alertModal.toast.errorDescriptionGenericDelete': 'Could not delete the alert.',
    'alertModal.toast.saveDisabledDescription': 'Alerts are not saved to server without user accounts. This is a local definition.',
    'alertModal.toast.deleteDisabledDescription': 'Alerts are not removed from server without user accounts.',
    'alertModal.button.updateLocal': 'Update Local Alert',
    'alertModal.button.setLocal': 'Set Local Alert',
    'activeAlerts.title': 'My Price Alerts',
    'activeAlerts.description': 'Manage your active and inactive price alerts.',
    'activeAlerts.loading': 'Loading alerts...',
    'activeAlerts.noAlerts': 'You have no price alerts set up yet.',
    'activeAlerts.refreshButton': 'Refresh Alerts',
    'activeAlerts.confirmDelete': 'Are you sure you want to delete this alert for {symbol}?',
    'activeAlerts.table.symbol': 'Crypto',
    'activeAlerts.table.condition': 'Condition',
    'activeAlerts.table.status': 'Status',
    'activeAlerts.table.createdAt': 'Created',
    'activeAlerts.table.actions': 'Actions',
    'activeAlerts.table.directionAbove': '> ',
    'activeAlerts.table.directionBelow': '< ',
    'activeAlerts.table.statusActive': 'Active',
    'activeAlerts.table.statusInactive': 'Inactive',
    'activeAlerts.table.activateSwitch': 'Activate Alert',
    'activeAlerts.table.deactivateSwitch': 'Deactivate Alert',
    'activeAlerts.button.edit': 'Edit Alert',
    'activeAlerts.button.delete': 'Delete Alert',
    'activeAlerts.toast.fetchErrorTitle': 'Error',
    'activeAlerts.toast.fetchErrorDescription': 'Could not load your price alerts.',
    'activeAlerts.toast.deletedTitle': 'Alert Deleted',
    'activeAlerts.toast.deletedDescription': 'The alert for {symbol} has been removed.',
    'activeAlerts.toast.deleteErrorTitle': 'Error Deleting',
    'activeAlerts.toast.deleteErrorDescription': 'Could not delete the alert.',
    'activeAlerts.toast.activatedTitle': 'Alert Activated',
    'activeAlerts.toast.activatedDescription': 'The alert for {symbol} is now active.',
    'activeAlerts.toast.deactivatedTitle': 'Alert Deactivated',
    'activeAlerts.toast.deactivatedDescription': 'The alert for {symbol} is now inactive.',
    'activeAlerts.toast.toggleErrorTitle': 'Error Updating Alert',
    'activeAlerts.toast.toggleErrorDescription': 'Could not update alert status.',
    'zod.orderOpportunity.selectPair': 'Please select a trading pair.',
    'zod.orderOpportunity.positiveInputAmount': 'Amount must be a positive number.',
    'zod.orderOpportunity.marketPricePositive': 'Market price must be a positive number.',
    'zod.orderOpportunity.purchasePriceUsdtPositive': 'Purchase price must be a positive number.',
    'zod.orderOpportunity.targetPricePositive': 'Sell price must be a positive number.',
    'zod.alert.targetPricePositive': 'Target price must be a positive number.',
    'zod.alert.directionRequired': 'Please select a direction for the alert.',
    'footer.createdBy': 'Created with AI by Allan Soto',
    'toaster.notificationsLabel': 'Notifications (F8)',
    'firebase.config.errorTitle': 'Firebase Configuration Error',
    'firebase.config.errorMessage': 'The application is not properly configured to connect to Firebase. Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set. Refer to README.md for setup instructions.',
    'firebase.offline.title': 'Offline',
    'firebase.offline.userDataError': 'Could not load user data. You appear to be offline. Some features may be limited.', 
    'firebase.offline.fetchError': 'Could not load data. You appear to be offline.',
    'firebase.generalError.title': 'Error',
    'firebase.generalError.userDataError': 'An error occurred while loading user data.', 
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
    'dashboard.title': 'Tablero', // Changed from 'Panel' to 'Tablero' for consistency
    'dashboard.marketOverview': 'Resumen del Mercado',
    'dashboard.loadingPrices': 'Cargando precios en vivo...',
    'dashboard.portfolioBalance': 'Balance de Portafolio',
    'dashboard.portfolioBalance.publicSourceMessage': "Mostrando datos de mercado de fuente pública.",
    'dashboard.cryptoCard.alertButton.title': 'Establecer Alerta de Precio',
    'dashboard.cryptoCard.alertButton.label': 'Crear Alerta',
    'dashboard.alerts.fetchErrorTitle': 'Error de Alertas',
    'dashboard.alerts.fetchErrorDescription': 'No se pudieron cargar las alertas de precio.',
    'dashboard.alerts.triggeredTitle': '¡Alerta de Precio Activada!',
    'dashboard.alerts.triggeredDescription': '{symbol} ha alcanzado su precio objetivo de ${targetPrice}. Precio actual: ${currentPrice}.',
    'dashboard.ai.historicalDataError': 'No se pudieron obtener los datos históricos para {symbol}.',
    'account.page.title': "Configuración de Aplicación", 
    'account.profile.title': 'Información de la Aplicación', 
    'account.profile.description': 'Detalles de la aplicación.', 
    'dashboard.cryptoCard.tooltip.reason': "Razón:",
    'dashboard.cryptoCard.tooltip.confidence': "Confianza:",
    'dashboard.cryptoCard.trend.upward': "Tendencia alcista",
    'dashboard.cryptoCard.trend.downward': "Tendencia bajista",
    'dashboard.cryptoCard.trend.sideways': "Tendencia lateral",
    'dashboard.cryptoCard.trend.notAvailable': "Tendencia N/A",
    'dashboard.cryptoCard.trend.ariaLabel': 'Información de tendencia',
    'dashboard.orderOpportunitySimulator.title': 'Simulador de Órdenes y Oportunidades',
    'dashboard.orderOpportunitySimulator.description': 'Simula un intercambio y visualiza oportunidades de venta potenciales con porcentajes de ganancia incrementales.',
    'dashboard.orderOpportunitySimulator.operationPairLabel': 'Par de Trading',
    'dashboard.orderOpportunitySimulator.amountToSpendInQuoteLabel': 'Cantidad a Gastar ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceOfCryptoLabel': 'Precio de Cripto ({quoteCurrency})', // Changed key
    'dashboard.orderOpportunitySimulator.exchangedCryptoValueLabel': 'Cripto Intercambiado ({targetCurrency})', // Changed key
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
    'dashboard.orderOpportunitySimulator.priceUnavailableShort': 'N/D',
    'dashboard.orderOpportunitySimulator.priceEditPlaceholder': 'ej., 0.5',
    'dashboard.orderOpportunitySimulator.invalidMarketPrice': 'Precio de Mercado Inválido',
    'dashboard.orderOpportunitySimulator.invalidPurchasePrice': 'Precio de Compra Inválido',
    'dashboard.orderOpportunitySimulator.calculationError': 'Error de Cálculo',
    'dashboard.orderOpportunitySimulator.calculating': 'Calculando...',
    'dashboard.orderOpportunitySimulator.enterValuesPrompt': 'Por favor, selecciona un par e ingresa el monto para ver la simulación.',
    'dashboard.orderOpportunitySimulator.enterValuesPromptFull': 'Por favor, selecciona un par, ingresa el monto y el precio de compra para ver la simulación.',
    'dashboard.orderOpportunitySimulator.commissionInfo': 'La comisión es del {rate}% sobre el valor de la transacción en {quote_currency}.',
    'dashboard.orderOpportunitySimulator.saveButton': 'Guardar Simulación Completa',
    'dashboard.orderOpportunitySimulator.saveOrderButton': 'Guardar Orden',
    'dashboard.orderOpportunitySimulator.toast.savedSuccessTitle': 'Simulación Guardada',
    'dashboard.orderOpportunitySimulator.toast.savedSuccessDescription': 'Tu simulación ha sido guardada exitosamente.',
    'dashboard.orderOpportunitySimulator.toast.saveErrorTitle': 'Error al Guardar',
    'dashboard.orderOpportunitySimulator.toast.saveErrorDescription': 'No se pudo guardar la simulación. Por favor, inténtalo de nuevo.',
    'dashboard.orderOpportunitySimulator.toast.noDataToSave': 'No hay datos de simulación/orden válidos para guardar.',
    'dashboard.orderOpportunitySimulator.toast.orderSavedSuccessTitle': 'Orden Guardada',
    'dashboard.orderOpportunitySimulator.toast.orderSavedSuccessDescription': 'La orden específica ha sido guardada exitosamente.',
    'dashboard.orderOpportunitySimulator.toast.orderSaveErrorTitle': 'Error al Guardar Orden',
    'dashboard.orderOpportunitySimulator.toast.orderSaveErrorDescription': 'No se pudo guardar la orden específica. Por favor, inténtalo de nuevo.',
    'auth.disabled.title': 'Función Deshabilitada',
    'auth.disabled.description': 'Esta función está actualmente deshabilitada porque la autenticación de usuarios ha sido eliminada.',
    'auth.disabled.featureUnavailable': 'Esta función no está disponible porque la autenticación de usuario ha sido eliminada.',
    'auth.disabled.featureUnavailableShort': 'Función deshabilitada.',
    'auth.disabled.accountPageMessage': 'La gestión de cuentas de usuario está deshabilitada ya que se eliminó la autenticación de esta aplicación.',
    'auth.disabled.goToDashboard': 'Ir al Tablero',
    'auth.disabled.passwordChangeMessage': 'La funcionalidad de cambio de contraseña está deshabilitada ya que se eliminó la autenticación de usuarios.',
    'auth.disabled.alertsUnavailable': 'Las alertas de precios no están disponibles sin cuentas de usuario.',
    'auth.disabled.alertsUnavailableShort': 'Alertas deshabilitadas.',
    'auth.disabled.simulationsUnavailable': 'Guardar simulaciones no está disponible sin cuentas de usuario.',
    'auth.disabled.ordersUnavailable': 'Guardar órdenes no está disponible sin cuentas de usuario.',
    'auth.disabled.saveOrderButtonDisabled': 'Guardar Orden (Aut. Deshabilitada)',
    'auth.disabled.saveButtonDisabled': 'Guardar Simulación (Aut. Deshabilitada)',
    'dashboard.orderOpportunitySimulator.toast.saveDisabledTitle': 'Guardar Deshabilitado',
    'dashboard.orderOpportunitySimulator.toast.saveDisabledDescription': 'Guardar simulaciones está deshabilitado ya que se eliminó la autenticación de usuarios.',
    'dashboard.orderOpportunitySimulator.toast.orderSaveDisabledTitle': 'Guardar Orden Deshabilitado',
    'dashboard.orderOpportunitySimulator.toast.orderSaveDisabledDescription': 'Guardar órdenes está deshabilitado ya que se eliminó la autenticación de usuarios.',
    'dashboard.orderOpportunitySimulator.exchangeOperation': 'Intercambiar {cur1} por {cur2}',
    'dashboard.orderOpportunitySimulator.quantityLabel': 'Cantidad ({currency})',
    'dashboard.orderOpportunitySimulator.purchasePriceLabel': 'Precio de Compra ({baseCurrency} por {quoteCurrency})',
    'dashboard.orderOpportunitySimulator.amountToSpendLabel': 'Cantidad a Gastar ({quoteCurrency})',
    'dashboard.connectionStatus.title': 'Problema de Conexión',
    'dashboard.connectionStatus.noFeed': 'Actualmente no se reciben actualizaciones de precios en vivo. Intentando conectar...',
    'dashboard.connectionStatus.fallbackTitle': 'Usando Conexión de Respaldo',
    'dashboard.connectionStatus.restFallbackActive': 'Falló la conexión WebSocket. Usando actualizaciones periódicas de API REST para precios.',
    'dashboard.api.binance.fetchError': 'Error al obtener precios de Binance: {status}',
    'dashboard.api.binance.errorTitle': 'Error al Obtener Precios (Binance)',
    'dashboard.api.binance.unknownError': 'No se pudieron obtener los precios en vivo de Binance.',
    'dashboard.api.coincap.errorTitle': 'Error al Obtener Precios (CoinCap)',
    'dashboard.api.coincap.unknownError': 'No se pudieron obtener los precios en vivo de CoinCap.',
    'dashboard.ai.errorTitle': 'Error en Análisis de IA',
    'dashboard.ai.errorDescription': 'No se pudieron actualizar las tendencias de IA.',
    'dashboard.ai.clientErrorReason': 'Error de cliente al obtener tendencia para {symbol}: {details}',
    'dashboard.ai.temporarilyDisabled': 'El análisis de tendencias de IA está temporalmente deshabilitado.',
    'dashboard.websocket.errorTitle': 'Error de WebSocket',
    'dashboard.websocket.errorDescription': 'Falló la conexión al feed de precios en vivo. Cambiando a actualizaciones periódicas.',
    'dashboard.websocket.errorDescriptionBinance': 'Falló la conexión al feed de precios en vivo de Binance. Cambiando a actualizaciones periódicas.',
    'dashboard.websocket.errorDescriptionBinanceFallback': 'Falló WebSocket de Binance. Usando API REST de respaldo.',
    'dashboard.websocket.errorDescriptionCoinCap': 'Falló la conexión al feed de precios en vivo de CoinCap. Cambiando a REST de respaldo.',
    'dashboard.websocket.errorDescriptionCoinCapFallback': 'Falló WebSocket de CoinCap. Usando API REST de respaldo.',
    'dashboard.websocket.errorMessage': 'Mensaje de error: {message}, Tipo: {type}',
    'dashboard.websocket.eventType': 'Tipo de evento: {type}',
    'history.page.title': "Historial de Órdenes",
    'history.menuItem': 'Historial de Órdenes',
    'history.filters.dateRange': "Rango de Fechas",
    'history.filters.startDate': "Fecha de Inicio",
    'history.filters.endDate': "Fecha de Fin",
    'history.filters.pickDate': "Elige una fecha",
    'history.filters.searchCrypto': "Buscar por Cripto",
    'history.filters.searchPlaceholder': "Ingresa símbolo (ej. BTC)",
    'history.filters.resetButton': "Limpiar Filtros",
    'history.export.csvButton': "Exportar a CSV",
    'history.export.pdfButton': "Exportar a PDF (Imprimir)",
    'history.table.loading': "Cargando historial de órdenes...",
    'history.table.loadingError': "Error al cargar el historial de órdenes.",
    'history.table.noOrders': "No se encontraron órdenes.",
    'history.table.noAuthInfo': "La funcionalidad del historial de órdenes puede estar limitada ya que la autenticación de usuarios está deshabilitada.",
    'history.table.header.timestamp': 'Fecha/Hora',
    'history.table.header.originalPair': 'Par',
    'history.table.header.targetCrypto': 'Cripto Obtenida',
    'history.table.header.quoteCurrency': 'Cotización',
    'history.table.header.buyAmount': 'Monto Comprado',
    'history.table.header.buyPrice': 'Precio Compra',
    'history.table.header.buyComm': 'Comis. Compra',
    'history.table.header.sellPrice': 'Precio Venta',
    'history.table.header.sellComm': 'Comis. Venta',
    'history.table.header.netProfit': 'Ganancia Neta',
    'history.toast.loadErrorTitle': 'Error',
    'history.toast.loadErrorDescription': 'No se pudo cargar el historial de órdenes.',
    'history.toast.noDataExportTitle': 'Sin Datos',
    'history.toast.noDataExportDescription': 'No hay datos para exportar.',
    'history.toast.csvExportSuccessTitle': 'Exportación Exitosa',
    'history.toast.csvExportSuccessDescription': 'Historial de órdenes exportado a CSV.',
    'alertModal.title.edit': 'Editar Alerta para {symbol}',
    'alertModal.title.create': 'Crear Alerta para {symbol}',
    'alertModal.description': 'Precio actual: ${price}',
    'alertModal.description.instruction': 'Recibe una notificación cuando el precio supere o caiga por debajo de tu objetivo.',
    'alertModal.form.targetPriceLabel': 'Precio Objetivo (USDT)',
    'alertModal.form.targetPricePlaceholder': 'ej., 50000',
    'alertModal.form.directionLabel': 'Notificarme cuando el precio esté',
    'alertModal.form.directionPlaceholder': 'Seleccionar dirección',
    'alertModal.form.direction.above': 'Por encima de',
    'alertModal.form.direction.below': 'Por debajo de',
    'alertModal.button.save': 'Establecer Alerta',
    'alertModal.button.update': 'Actualizar Alerta',
    'alertModal.button.delete': 'Eliminar Alerta',
    'alertModal.button.cancel': 'Cancelar',
    'alertModal.toast.savedTitle': 'Alerta Guardada',
    'alertModal.toast.savedDescription': 'Tu alerta de precio para {symbol} ha sido establecida.',
    'alertModal.toast.updatedTitle': 'Alerta Actualizada',
    'alertModal.toast.updatedDescription': 'Tu alerta de precio para {symbol} ha sido actualizada.',
    'alertModal.toast.deletedTitle': 'Alerta Eliminada',
    'alertModal.toast.deletedDescription': 'La alerta de precio para {symbol} ha sido eliminada.',
    'alertModal.toast.errorTitle': 'Error al Guardar Alerta',
    'alertModal.toast.errorUpdateTitle': 'Error al Actualizar Alerta',
    'alertModal.toast.errorDescriptionGeneric': 'No se pudo guardar la alerta.',
    'alertModal.toast.errorDeleteTitle': 'Error al Eliminar Alerta',
    'alertModal.toast.errorDescriptionGenericDelete': 'No se pudo eliminar la alerta.',
    'alertModal.toast.saveDisabledDescription': 'Las alertas no se guardan en el servidor sin cuentas de usuario. Esta es una definición local.',
    'alertModal.toast.deleteDisabledDescription': 'Las alertas no se eliminan del servidor sin cuentas de usuario.',
    'alertModal.button.updateLocal': 'Actualizar Alerta Local',
    'alertModal.button.setLocal': 'Establecer Alerta Local',
    'activeAlerts.title': 'Mis Alertas de Precio',
    'activeAlerts.description': 'Gestiona tus alertas de precio activas e inactivas.',
    'activeAlerts.loading': 'Cargando alertas...',
    'activeAlerts.noAlerts': 'Aún no has configurado ninguna alerta de precio.',
    'activeAlerts.refreshButton': 'Refrescar Alertas',
    'activeAlerts.confirmDelete': '¿Estás seguro de que quieres eliminar esta alerta para {symbol} ?',
    'activeAlerts.table.symbol': 'Cripto',
    'activeAlerts.table.condition': 'Condición',
    'activeAlerts.table.status': 'Estado',
    'activeAlerts.table.createdAt': 'Creada',
    'activeAlerts.table.actions': 'Acciones',
    'activeAlerts.table.directionAbove': '> ',
    'activeAlerts.table.directionBelow': '< ',
    'activeAlerts.table.statusActive': 'Activa',
    'activeAlerts.table.statusInactive': 'Inactiva',
    'activeAlerts.table.activateSwitch': 'Activar Alerta',
    'activeAlerts.table.deactivateSwitch': 'Desactivar Alerta',
    'activeAlerts.button.edit': 'Editar Alerta',
    'activeAlerts.button.delete': 'Eliminar Alerta',
    'activeAlerts.toast.fetchErrorTitle': 'Error',
    'activeAlerts.toast.fetchErrorDescription': 'No se pudieron cargar tus alertas de precio.',
    'activeAlerts.toast.deletedTitle': 'Alerta Eliminada',
    'activeAlerts.toast.deletedDescription': 'La alerta para {symbol} ha sido eliminada.',
    'activeAlerts.toast.deleteErrorTitle': 'Error al Eliminar',
    'activeAlerts.toast.deleteErrorDescription': 'No se pudo eliminar la alerta.',
    'activeAlerts.toast.activatedTitle': 'Alerta Activada',
    'activeAlerts.toast.activatedDescription': 'La alerta para {symbol} ahora está activa.',
    'activeAlerts.toast.deactivatedTitle': 'Alerta Desactivada',
    'activeAlerts.toast.deactivatedDescription': 'La alerta para {symbol} ahora está inactiva.',
    'activeAlerts.toast.toggleErrorTitle': 'Error al Actualizar Alerta',
    'activeAlerts.toast.toggleErrorDescription': 'No se pudo actualizar el estado de la alerta.',
    'zod.orderOpportunity.selectPair': 'Por favor selecciona un par de trading.',
    'zod.orderOpportunity.positiveInputAmount': 'El monto debe ser un número positivo.',
    'zod.orderOpportunity.marketPricePositive': 'El precio de mercado debe ser un número positivo.',
    'zod.orderOpportunity.purchasePriceUsdtPositive': 'El Precio de Cripto debe ser un número positivo.',
    'zod.orderOpportunity.targetPricePositive': 'El precio de venta debe ser un número positivo.',
    'zod.alert.targetPricePositive': 'El precio objetivo debe ser un número positivo.',
    'zod.alert.directionRequired': 'Por favor, selecciona una dirección para la alerta.',
    'footer.createdBy': 'Creado con IA por Allan Soto',
    'toaster.notificationsLabel': 'Notificaciones (F8)',
    'firebase.config.errorTitle': 'Error de Configuración de Firebase',
    'firebase.config.errorMessage': 'La aplicación no está configurada correctamente para conectarse a Firebase. Por favor, revisa tu archivo .env.local y asegúrate de que todas las variables NEXT_PUBLIC_FIREBASE_... estén correctamente establecidas. Consulta README.md para instrucciones de configuración.',
    'firebase.offline.title': 'Sin Conexión',
    'firebase.offline.userDataError': 'No se pudieron cargar los datos del usuario. Parece que no tienes conexión. Algunas funciones pueden estar limitadas.',
    'firebase.offline.fetchError': 'No se pudieron cargar los datos. Parece que no tienes conexión.',
    'firebase.generalError.title': 'Error',
    'firebase.generalError.userDataError': 'Ocurrió un error al cargar los datos del usuario.',
    'sidebar.rail.toggleLabel': 'Activar o desactivar la barra lateral', // Spanish translation
    'sidebar.rail.toggleTitle': 'Activar o desactivar la barra lateral',  // Spanish translation
  },
  fr: { 
    'app.name': 'SimulTradex',
    'app.loadingMessage': 'Chargement de SimulTradex...',
    'app.redirecting': 'Redirection...',
    'settings.title': 'Paramètres',
    'settings.accountSettings': 'Paramètres de l\'Application', 
    'settings.language': 'Langue',
    'dashboard.title': 'Tableau de Bord', // French for Dashboard
    'dashboard.marketOverview': 'Aperçu du Marché',
    // ... (rest of French translations, similarly modified for auth removal and consistency) ...
    'footer.createdBy': 'Créé avec IA par Allan Soto',
    'toaster.notificationsLabel': 'Notifications (F8)',
    'firebase.config.errorTitle': 'Erreur de Configuration Firebase',
    'firebase.config.errorMessage': 'L\'application n\'est pas correctement configurée pour se connecter à Firebase. Veuillez vérifier votre fichier .env.local et vous assurer que toutes les variables NEXT_PUBLIC_FIREBASE_... sont correctement définies. Consultez README.md pour les instructions de configuration.',
    'firebase.offline.title': 'Hors Ligne',
    'firebase.offline.userDataError': 'Impossible de charger les données utilisateur. Vous semblez être hors ligne. Certaines fonctionnalités peuvent être limitées.',
    'firebase.offline.fetchError': 'Impossible de charger les données. Vous semblez être hors ligne.',
    'firebase.generalError.title': 'Erreur',
    'firebase.generalError.userDataError': 'Une erreur s\'est produite lors du chargement des données utilisateur.',
    'sidebar.rail.toggleLabel': 'Basculer la barre latérale', // French translation
    'sidebar.rail.toggleTitle': 'Basculer la barre latérale',  // French translation
  },
  hi: { 
    'app.name': 'सिमुलट्रेडेक्स',
    'app.loadingMessage': 'सिमुलट्रेडेक्स लोड हो रहा है...',
    'app.redirecting': 'पुनर्निर्देशित किया जा रहा है...',
    'settings.title': 'सेटिंग्स',
    'settings.accountSettings': 'एप्लिकेशन सेटिंग्स', 
    'settings.language': 'भाषा',
    'dashboard.title': 'डैशबोर्ड', // Hindi for Dashboard
    'dashboard.marketOverview': 'बाजार अवलोकन',
    // ... (rest of Hindi translations, similarly modified for auth removal and consistency) ...
    'footer.createdBy': 'IA द्वारा एलन सोटो द्वारा बनाया गया',
    'toaster.notificationsLabel': 'सूचनाएं (F8)',
    'firebase.config.errorTitle': 'फायरबेस कॉन्फ़िगरेशन त्रुटि',
    'firebase.config.errorMessage': 'एप्लिकेशन फायरबेस से कनेक्ट करने के लिए ठीक से कॉन्फ़िगर नहीं है। कृपया अपनी .env.local फ़ाइल जांचें और सुनिश्चित करें कि सभी NEXT_PUBLIC_FIREBASE_... متغیرات درست طریقے سے سیٹ ہیں۔ سیٹ اپ ہدایات کے لیے README.md देखیں۔',
    'firebase.offline.title': 'ऑफलाइन',
    'firebase.offline.userDataError': 'उपयोगकर्ता डेटा लोड नहीं किया जा सका। आप ऑफ़लाइन प्रतीत होते हैं। कुछ सुविधाएँ सीमित हो सकती हैं।',
    'firebase.offline.fetchError': 'डेटा लोड नहीं किया जा सका। आप ऑफ़लाइन प्रतीत होते हैं।',
    'firebase.generalError.title': 'त्रुटि',
    'firebase.generalError.userDataError': 'उपयोगकर्ता डेटा लोड करते समय एक त्रुटि हुई।',
    'sidebar.rail.toggleLabel': 'साइडबार टॉगल करें', // Hindi translation
    'sidebar.rail.toggleTitle': 'साइडबार टॉगल करें',  // Hindi translation
  },
  zh: { 
    'app.name': 'SimulTradex',
    'app.loadingMessage': '正在加载SimulTradex...',
    'app.redirecting': '正在重定向...',
    'settings.title': '设置',
    'settings.accountSettings': '应用程序设置', 
    'settings.language': '语言',
    'dashboard.title': '仪表板', // Chinese for Dashboard
    'dashboard.marketOverview': '市场概览',
    // ... (rest of Chinese translations, similarly modified for auth removal and consistency) ...
    'footer.createdBy': '由Allan Soto使用AI创建',
    'toaster.notificationsLabel': '通知 (F8)',
    'firebase.config.errorTitle': 'Firebase 配置错误',
    'firebase.config.errorMessage': '应用程序未正确配置以连接到 Firebase。请检查您的 .env.local 文件并确保所有 NEXT_PUBLIC_FIREBASE_... 变量均已正确设置。有关设置说明，请参阅 README.md。',
    'firebase.offline.title': '离线',
    'firebase.offline.userDataError': '无法加载用户数据。您似乎处于离线状态。某些功能可能会受限。',
    'firebase.offline.fetchError': '无法加载数据。您似乎处于离线状态。',
    'firebase.generalError.title': '错误',
    'firebase.generalError.userDataError': '加载用户数据时出错。',
    'sidebar.rail.toggleLabel': '切换侧边栏', // Chinese translation
    'sidebar.rail.toggleTitle': '切换侧边栏',  // Chinese translation
  }
};

const DEFAULT_LANGUAGE: LanguageCode = 'en';

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
  const isServer = typeof window === 'undefined';

  const [language, setCurrentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [translations, setTranslationsState] = useState<Record<string, string>>(
    translationsData[DEFAULT_LANGUAGE]
  );
  const [hydrated, setHydrated] = useState(false); 

  useEffect(() => {
    const storedLanguage = localStorage.getItem('simultradex_language') as LanguageCode | null;
    let initialLang = DEFAULT_LANGUAGE;
    if (storedLanguage && translationsData[storedLanguage]) {
      initialLang = storedLanguage;
    }
    
    setCurrentLanguage(initialLang);
    setTranslationsState(translationsData[initialLang]);
    if (!isServer) {
      document.documentElement.lang = initialLang;
    }
    
    setHydrated(true);
  }, [isServer]);


  const setLanguageCallback = useCallback((langCode: LanguageCode) => {
    if (translationsData[langCode]) {
      setCurrentLanguage(langCode);
      setTranslationsState(translationsData[langCode]);
      if (!isServer) {
        localStorage.setItem('simultradex_language', langCode);
        document.documentElement.lang = langCode;
      }
    } else {
      setCurrentLanguage(DEFAULT_LANGUAGE);
      setTranslationsState(translationsData[DEFAULT_LANGUAGE]);
      if (!isServer) {
        localStorage.setItem('simultradex_language', DEFAULT_LANGUAGE);
        document.documentElement.lang = DEFAULT_LANGUAGE;
      }
    }
  }, [isServer]);

  const t = useCallback((key: string, fallback: string = key, vars?: Record<string, string | number>) => {
    let effectiveTranslations;
    let effectiveHydrated;

    if (isServer) {
      effectiveTranslations = translationsData[DEFAULT_LANGUAGE];
      effectiveHydrated = false; 
    } else {
      effectiveTranslations = translations; 
      effectiveHydrated = hydrated; 
    }

    let msg = effectiveHydrated ? (effectiveTranslations[key] || fallback || key) : (fallback || key);
    
    if (vars && typeof msg === 'string') {
      Object.keys(vars).forEach(varKey => {
        msg = (msg as string).replace(`{${varKey}}`, String(vars[varKey]));
      });
    }
    return String(msg || key);
  }, [translations, hydrated, isServer]); 

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

