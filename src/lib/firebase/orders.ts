// src/lib/firebase/orders.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { SavedOrder } from '@/lib/types';

export async function saveOrderToFirebase(userId: string, orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'>): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to save the order.');
  }

  try {
    const docRef = await addDoc(collection(db, `HistorialDeOrdenes/${userId}/ordenes`), { // Changed collection path
      ...orderData,
      userId: userId, // Storing userId inside the document as well
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
