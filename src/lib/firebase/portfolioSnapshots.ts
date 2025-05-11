// src/lib/firebase/portfolioSnapshots.ts
'use server';

import { collection, doc, getDoc, setDoc, serverTimestamp, query, orderBy, limit, getDocs, Timestamp, collectionGroup, where } from 'firebase/firestore';
import { db } from './config';
import type { PortfolioSnapshot } from '@/lib/types';
import { format, subDays, startOfMonth } from 'date-fns';

const SNAPSHOT_COLLECTION_NAME = 'portfolioSnapshots';
const DAILY_SUBCOLLECTION_NAME = 'daily';

/**
 * Saves a daily portfolio snapshot for a user.
 * It will overwrite if a snapshot for the same day already exists.
 */
export async function saveDailyPortfolioSnapshot(userId: string, date: Date, totalValueUSDT: number): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to save portfolio snapshot.');
  }
  const dateString = format(date, 'yyyy-MM-dd');
  const snapshotRef = doc(db, SNAPSHOT_COLLECTION_NAME, userId, DAILY_SUBCOLLECTION_NAME, dateString);

  try {
    await setDoc(snapshotRef, {
      valueUSDT: totalValueUSDT,
      timestamp: serverTimestamp(), // Firestore server timestamp
    }, { merge: true }); // Use merge to create or update
  } catch (error) {
    console.error('Error saving daily portfolio snapshot to Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save daily portfolio snapshot: ${error.message}`);
    }
    throw new Error('An unknown error occurred while saving the daily portfolio snapshot.');
  }
}

/**
 * Gets a specific daily portfolio snapshot for a user.
 */
export async function getDailyPortfolioSnapshot(userId: string, date: Date): Promise<PortfolioSnapshot | null> {
  if (!userId) {
    throw new Error('User ID is required to fetch portfolio snapshot.');
  }
  const dateString = format(date, 'yyyy-MM-dd');
  const snapshotRef = doc(db, SNAPSHOT_COLLECTION_NAME, userId, DAILY_SUBCOLLECTION_NAME, dateString);

  try {
    const docSnap = await getDoc(snapshotRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Ensure timestamp is converted to JS Date object
      const snapshotDate = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(dateString); // Use dateString as fallback

      return {
        id: docSnap.id,
        date: snapshotDate,
        valueUSDT: data.valueUSDT,
        timestamp: data.timestamp,
      } as PortfolioSnapshot;
    }
    return null;
  } catch (error) {
    console.error('Error fetching daily portfolio snapshot from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch daily portfolio snapshot: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching the daily portfolio snapshot.');
  }
}

/**
 * Gets all daily portfolio snapshots for a user within a given month.
 */
export async function getMonthlyPortfolioSnapshots(userId: string, monthDate: Date): Promise<PortfolioSnapshot[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch monthly portfolio snapshots.');
  }

  const year = format(monthDate, 'yyyy');
  const month = format(monthDate, 'MM');
  // Firestore queries for IDs starting with YYYY-MM
  const startDateString = `${year}-${month}-01`;
  const endDateString = `${year}-${month}-31`; // A bit of a hack, better to query by actual start/end dates if possible or structure differently.
                                                // For ID based, we can use a range query.

  const snapshotsRef = collection(db, SNAPSHOT_COLLECTION_NAME, userId, DAILY_SUBCOLLECTION_NAME);
  // Query documents where the ID (which is yyyy-MM-dd) is within the month.
   const q = query(snapshotsRef, 
                  where(Timestamp.documentId(), ">=", startDateString), 
                  where(Timestamp.documentId(), "<=", endDateString), 
                  orderBy(Timestamp.documentId(), 'asc'));


  try {
    const querySnapshot = await getDocs(q);
    const snapshots: PortfolioSnapshot[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const snapshotDate = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(docSnap.id);
      snapshots.push({
        id: docSnap.id,
        date: snapshotDate, // Use the doc ID (yyyy-MM-dd) to construct the date object
        valueUSDT: data.valueUSDT,
        timestamp: data.timestamp,
      } as PortfolioSnapshot);
    });
    return snapshots;
  } catch (error) {
    console.error('Error fetching monthly portfolio snapshots from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch monthly portfolio snapshots: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching monthly portfolio snapshots.');
  }
}

/**
 * Gets the latest daily portfolio snapshot for a user.
 */
export async function getLatestDailyPortfolioSnapshot(userId: string): Promise<PortfolioSnapshot | null> {
  if (!userId) {
    throw new Error('User ID is required to fetch the latest portfolio snapshot.');
  }
  const snapshotsRef = collection(db, SNAPSHOT_COLLECTION_NAME, userId, DAILY_SUBCOLLECTION_NAME);
  const q = query(snapshotsRef, orderBy(Timestamp.documentId(), 'desc'), limit(1));

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const snapshotDate = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(docSnap.id);
      return {
        id: docSnap.id,
        date: snapshotDate,
        valueUSDT: data.valueUSDT,
        timestamp: data.timestamp,
      } as PortfolioSnapshot;
    }
    return null;
  } catch (error) {
    console.error('Error fetching latest daily portfolio snapshot from Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch latest daily portfolio snapshot: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching the latest daily portfolio snapshot.');
  }
}
