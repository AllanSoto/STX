// src/lib/firebase/orders.ts
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { SavedOrder } from '@/lib/types';

export async function saveOrderToFirebase(userId: string, orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'>): Promise<string> {
  if (!userId) {
    console.warn('saveOrderToFirebase called without userId. Order not saved.');
    throw new Error('User ID is required to save the order.');
  }

  try {
    // Store orders in a subcollection under a general 'orders' collection, keyed by userId
    const userOrdersCollectionRef = collection(db, 'userOrders', userId, 'orders');
    const docRef = await addDoc(userOrdersCollectionRef, { 
      ...orderData,
      // userId is implicitly part of the path, but can be stored redundantly if desired for easier querying across users (admin only)
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error saving order to Firebase:', error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to save order: The application is offline. Your order will be saved once you are back online.');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to save order: ${error.message}`);
    }
    throw new Error('An unknown error occurred while saving the order.');
  }
}

export async function getOrdersForUser(userId: string | null): Promise<SavedOrder[]> {
  if (!userId) {
    console.log("getOrdersForUser called without user. Returning empty array.");
    return Promise.resolve([]); 
  }
  try {
    const userOrdersCollectionRef = collection(db, 'userOrders', userId, 'orders');
    const q = query(userOrdersCollectionRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders: SavedOrder[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      orders.push({
        id: docSnap.id,
        userId: userId, // Add userId from parameter
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp?.seconds * 1000 || Date.now()),
        targetCrypto: data.targetCrypto,
        quoteCurrency: data.quoteCurrency,
        amountOfTargetCryptoBought: data.amountOfTargetCryptoBought,
        buyPricePerUnit: data.buyPricePerUnit,
        totalBuyValueInQuote: data.totalBuyValueInQuote,
        buyCommissionInQuote: data.buyCommissionInQuote,
        sellPricePerUnit: data.sellPricePerUnit,
        totalSellValueInQuote: data.totalSellValueInQuote,
        sellCommissionInQuote: data.sellCommissionInQuote,
        netProfitInQuote: data.netProfitInQuote,
        originalPair: data.originalPair,
        inputAmount: data.inputAmount,
        inputCurrency: data.inputCurrency,
      } as SavedOrder); 
    });
    return orders;
  } catch (error: any) {
    console.error(`Error fetching orders for user ${userId} from Firebase:`, error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to fetch orders: The application is offline. Please check your internet connection.');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching orders.');
  }
}

