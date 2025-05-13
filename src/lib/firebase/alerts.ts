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

const ALERTS_COLLECTION_BASE = 'userAlerts'; // Base collection for user-specific alerts

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
  try {
    const userAlertsCollectionRef = collection(db, ALERTS_COLLECTION_BASE, userId, 'alerts');
    const docRef = await addDoc(userAlertsCollectionRef, {
      // userId is part of the path, not stored in doc unless needed for cross-user admin queries
      ...alertData,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Error saving price alert to Firebase:', error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to save price alert: The application is offline. Your alert will be saved once you are back online.');
    }
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
  try {
    const userAlertsCollectionRef = collection(db, ALERTS_COLLECTION_BASE, userId, 'alerts');
    const q = query(userAlertsCollectionRef, where('active', '==', true), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const alerts: PriceAlert[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      alerts.push({
        id: docSnap.id,
        userId: userId, // Add userId from parameter
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
  } catch (error: any) {
    console.error('Error fetching active price alerts from Firebase:', error);
     if (error.code === 'unavailable') {
      throw new Error('Failed to fetch active price alerts: The application is offline. Please check your internet connection.');
    }
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
  try {
    const userAlertsCollectionRef = collection(db, ALERTS_COLLECTION_BASE, userId, 'alerts');
    const q = query(userAlertsCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const alerts: PriceAlert[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      alerts.push({
        id: docSnap.id,
        userId: userId, // Add userId from parameter
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
  } catch (error: any) {
    console.error('Error fetching all price alerts from Firebase:', error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to fetch all price alerts: The application is offline. Please check your internet connection.');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to fetch all price alerts: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching all price alerts.');
  }
}


export async function updatePriceAlert(userId: string, alertId: string, updates: Partial<Omit<PriceAlert, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
   if (!userId) {
    console.warn('updatePriceAlert called without userId. Alert not updated.');
    throw new Error('User ID is required to update the alert.');
  }
  const alertRef = doc(db, ALERTS_COLLECTION_BASE, userId, 'alerts', alertId);
  try {
    await updateDoc(alertRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating price alert in Firebase:', error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to update price alert: The application is offline. Changes will be synced when online.');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to update price alert: ${error.message}`);
    }
    throw new Error('An unknown error occurred while updating the price alert.');
  }
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<void> {
  if (!userId) {
    console.warn('deletePriceAlert called without userId. Alert not deleted.');
    throw new Error('User ID is required to delete the alert.');
  }
  const alertRef = doc(db, ALERTS_COLLECTION_BASE, userId, 'alerts', alertId);
  try {
    await deleteDoc(alertRef);
  } catch (error: any) {
    console.error('Error deleting price alert from Firebase:', error);
    if (error.code === 'unavailable') {
      throw new Error('Failed to delete price alert: The application is offline. This action will be processed when online.');
    }
    if (error instanceof Error) {
      throw new Error(`Failed to delete price alert: ${error.message}`);
    }
    throw new Error('An unknown error occurred while deleting the price alert.');
  }
}

export async function deactivatePriceAlert(userId: string, alertId: string): Promise<void> {
  if (!userId) {
    console.warn('deactivatePriceAlert called without userId. Alert not deactivated.');
    throw new Error('User ID is required to deactivate the alert.');
  }
  await updatePriceAlert(userId, alertId, { active: false, triggeredAt: serverTimestamp() });
}

