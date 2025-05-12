
// src/lib/firebase/orders.ts
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { SavedOrder } from '@/lib/types';

// Saving orders is user-specific, this function will no longer be called by components.
// It's kept here for completeness but would be removed or adapted in a full non-auth refactor.
export async function saveOrderToFirebase(userId: string, orderData: Omit<SavedOrder, 'id' | 'userId' | 'timestamp'>): Promise<string> {
  if (!userId) {
    // This case should not be reached if components stop calling it without a user.
    console.warn('saveOrderToFirebase called without userId. Order not saved.');
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

// Modified to not require userId and return empty array as specific user data is removed.
// In a real scenario without auth, this might fetch public/sample data or be removed.
export async function getOrdersForUser(): Promise<SavedOrder[]> {
  console.log("getOrdersForUser called without specific user context. Returning empty array.");
  // This function previously fetched orders for a specific user.
  // Since authentication is removed, there's no specific user to fetch for.
  // Returning an empty array for now.
  // To show shared data, this would need to point to a general collection path.
  // Example of fetching from a shared path (if one existed):
  // const ordersRef = collection(db, `PublicHistorialDeOrdenes/all/ordenes`);
  // const q = query(ordersRef, orderBy('timestamp', 'desc'));
  // const querySnapshot = await getDocs(q); ... etc.
  return Promise.resolve([]); 
}
