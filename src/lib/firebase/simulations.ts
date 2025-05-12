
// src/lib/firebase/simulations.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { SimulationLogEntry } from '@/lib/types';

// Saving simulations is user-specific, this function will no longer be called by components.
// Kept for completeness but would be removed or adapted in a full non-auth refactor.
export async function saveSimulationToFirebase(userId: string, simulationData: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'>): Promise<string> {
  if (!userId) {
    // This case should not be reached.
    console.warn('saveSimulationToFirebase called without userId. Simulation not saved.');
    throw new Error('User ID is required to save simulation.');
  }

  try {
    const docRef = await addDoc(collection(db, 'simulaciones'), { // Still points to a general 'simulaciones' collection
      ...simulationData,
      usuario_id: userId, // but includes userId, making it user-specific
      fecha: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving simulation to Firebase:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to save simulation: ${error.message}`);
    }
    throw new Error('An unknown error occurred while saving the simulation.');
  }
}
