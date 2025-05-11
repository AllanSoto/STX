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

export interface PriceAlertData {
  symbol: CryptoSymbol;
  targetPrice: number;
  direction: AlertDirection;
}

// Save a new price alert
export async function savePriceAlert(userId: string, alertData: PriceAlertData): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to save the alert.');
  }
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

// Get all active price alerts for a user
export async function getActivePriceAlertsForUser(userId: string): Promise<PriceAlert[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch alerts.');
  }
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

// Get all price alerts for a user (active and inactive)
export async function getAllPriceAlertsForUser(userId: string): Promise<PriceAlert[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch alerts.');
  }
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


// Update an existing price alert
export async function updatePriceAlert(alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
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

// Delete a price alert
export async function deletePriceAlert(alertId: string): Promise<void> {
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

// Deactivate an alert (e.g., after it's triggered)
export async function deactivatePriceAlert(alertId: string): Promise<void> {
  await updatePriceAlert(alertId, { active: false, triggeredAt: serverTimestamp() });
}
