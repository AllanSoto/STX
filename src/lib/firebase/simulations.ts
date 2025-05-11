// src/lib/firebase/simulations.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { SimulationLogEntry } from '@/lib/types';

export async function saveSimulationToFirebase(userId: string, simulationData: Omit<SimulationLogEntry, 'id' | 'usuario_id' | 'fecha'>): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to save simulation.');
  }

  try {
    const docRef = await addDoc(collection(db, 'simulaciones'), {
      ...simulationData,
      usuario_id: userId,
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
