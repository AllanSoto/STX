// src/lib/firebase/simulations.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseProperlyConfigured } from './config'; // Import isFirebaseProperlyConfigured
import type { SimulationLogEntry } from '@/lib/types';

export async function saveSimulationToFirebase(userId: string | null, simulationData: Omit<SimulationLogEntry, 'id' | 'userId' | 'fecha'>): Promise<string> {
  if (!isFirebaseProperlyConfigured) {
    console.warn('Firebase not configured. Cannot save simulation.');
    throw new Error('Firebase is not configured. Simulation cannot be saved.');
  }
  if (!userId) {
    console.warn('saveSimulationToFirebase called without userId. Simulation not saved (feature disabled in no-auth mode).');
    throw new Error('User ID is required to save simulation.');
  }

  try {
    // Store simulations in a subcollection under a general 'simulations' collection, keyed by userId
    const userSimulationsCollectionRef = collection(db, 'userSimulations', userId, 'simulations');
    const docRef = await addDoc(userSimulationsCollectionRef, {
      ...simulationData,
      // userId is implicitly part of the path
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

// If a function to get simulations for a user is needed, it would look like this:
/*
import { query, orderBy, getDocs } from 'firebase/firestore';

export async function getSimulationsForUser(userId: string): Promise<SimulationLogEntry[]> {
  if (!isFirebaseProperlyConfigured) { // Guard added
    console.warn('Firebase not configured. Cannot fetch simulations.');
    return Promise.resolve([]);
  }
  if (!userId) {
    return Promise.resolve([]);
  }
  try {
    const userSimulationsCollectionRef = collection(db, 'userSimulations', userId, 'simulations');
    const q = query(userSimulationsCollectionRef, orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    const simulations: SimulationLogEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      simulations.push({
        id: docSnap.id,
        userId: userId,
        fecha: data.fecha, // Keep as Firestore Timestamp or convert to Date
        par_operacion: data.par_operacion,
        monto_compra_usdt: data.monto_compra_usdt,
        precio_compra: data.precio_compra,
        cantidad_cripto_comprada: data.cantidad_cripto_comprada,
        comision_compra: data.comision_compra,
        ventas_simuladas: data.ventas_simuladas,
      } as SimulationLogEntry);
    });
    return simulations;
  } catch (error) {
    console.error(`Error fetching simulations for user ${userId}:`, error);
    throw error;
  }
}
*/
