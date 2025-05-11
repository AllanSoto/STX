// src/lib/firebase/orders.ts
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { SavedOrder } from '@/lib/types';

export async function saveOrderToFirebase(userId: string, orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'>): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to save the order.');
  }

  try {
    const docRef = await addDoc(collection(db, `HistorialDeOrdenes/${userId}/ordenes`), { 
      ...orderData,
      userId: userId, 
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving order to Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save order: ${error.message}`);
    }
    throw new Error('An unknown error occurred while saving the order.');
  }
}

export async function getOrdersForUser(userId: string): Promise<SavedOrder[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch orders.');
  }

  try {
    const ordersRef = collection(db, `HistorialDeOrdenes/${userId}/ordenes`);
    const q = query(ordersRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders: SavedOrder[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure timestamp is converted to JS Date object
      const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(); // Fallback for safety

      orders.push({
        id: doc.id,
        userId: data.userId,
        timestamp,
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
      } as SavedOrder); // Type assertion might be needed if fields are optional or TS struggles with conversion
    });
    return orders;
  } catch (error) {
    console.error('Error fetching orders from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching orders.');
  }
}
