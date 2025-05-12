
// src/lib/firebase/alerts.ts
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './config';
import type { PriceAlert, AlertDirection, CryptoSymbol } from '@/lib/types';

const ALERTS_COLLECTION = 'alerts';

// Note: All functions in this file are user-specific and will effectively become unused
// as components will stop calling them due to authentication removal.
// They are kept for structural completeness but would be removed or heavily refactored
// in a scenario where alerts are managed without user accounts (e.g., locally).

export interface PriceAlertData {
  symbol: CryptoSymbol;
  targetPrice: number;
  direction: AlertDirection;
}

export async function savePriceAlert(userId: string, alertData: PriceAlertData): Promise<string> {
  if (!userId) {
    console.warn('savePriceAlert called without userId. Alert not saved.');
    throw new Error('User ID is required to save the alert.');
  }
  // ... (implementation remains but won't be called)
  try {
    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), {
      userId,
      ...alertData,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving price alert to Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save price alert: ${error.message}`);
    }
    throw new Error('An unknown error occurred while saving the price alert.');
  }
}

export async function getActivePriceAlertsForUser(userId: string): Promise<PriceAlert[]> {
  if (!userId) {
    console.warn('getActivePriceAlertsForUser called without userId. Returning empty array.');
    return Promise.resolve([]);
  }
  // ... (implementation remains but won't be called meaningfully)
  try {
    const alertsRef = collection(db, ALERTS_COLLECTION);
    const q = query(alertsRef, where('userId', '==', userId), where('active', '==', true), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const alerts: PriceAlert[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      alerts.push({
        id: docSnap.id,
        userId: data.userId,
        symbol: data.symbol,
        targetPrice: data.targetPrice,
        direction: data.direction,
        active: data.active,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        triggeredAt: data.triggeredAt instanceof Timestamp ? data.triggeredAt.toDate() : undefined,
      } as PriceAlert);
    });
    return alerts;
  } catch (error) {
    console.error('Error fetching active price alerts from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch active price alerts: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching active price alerts.');
  }
}

export async function getAllPriceAlertsForUser(userId: string): Promise<PriceAlert[]> {
  if (!userId) {
    console.warn('getAllPriceAlertsForUser called without userId. Returning empty array.');
    return Promise.resolve([]);
  }
  // ... (implementation remains)
  try {
    const alertsRef = collection(db, ALERTS_COLLECTION);
    const q = query(alertsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const alerts: PriceAlert[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      alerts.push({
        id: docSnap.id,
        userId: data.userId,
        symbol: data.symbol,
        targetPrice: data.targetPrice,
        direction: data.direction,
        active: data.active,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
        triggeredAt: data.triggeredAt instanceof Timestamp ? data.triggeredAt.toDate() : undefined,
      } as PriceAlert);
    });
    return alerts;
  } catch (error) {
    console.error('Error fetching all price alerts from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch all price alerts: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching all price alerts.');
  }
}


export async function updatePriceAlert(alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  // This function would require knowing an alertId, which implies it was fetched for a user.
  // As user-specific fetching is removed, this is unlikely to be called meaningfully.
  console.warn('updatePriceAlert called. This function may not work as expected without user context.');
  const alertRef = doc(db, ALERTS_COLLECTION, alertId);
  try {
    await updateDoc(alertRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating price alert in Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update price alert: ${error.message}`);
    }
    throw new Error('An unknown error occurred while updating the price alert.');
  }
}

export async function deletePriceAlert(alertId: string): Promise<void> {
  console.warn('deletePriceAlert called. This function may not work as expected without user context.');
  const alertRef = doc(db, ALERTS_COLLECTION, alertId);
  try {
    await deleteDoc(alertRef);
  } catch (error) {
    console.error('Error deleting price alert from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to delete price alert: ${error.message}`);
    }
    throw new Error('An unknown error occurred while deleting the price alert.');
  }
}

export async function deactivatePriceAlert(alertId: string): Promise<void> {
  console.warn('deactivatePriceAlert called. This function may not work as expected without user context.');
  await updatePriceAlert(alertId, { active: false, triggeredAt: serverTimestamp() });
}
