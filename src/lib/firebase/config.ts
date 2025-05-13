// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export let isFirebaseProperlyConfigured = true; // Assume true initially

const requiredEnvVars: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  // storageBucket, messagingSenderId, appId are often not strictly required for basic auth/firestore
  // but good to have. measurementId is optional.
];

let missingVars: string[] = [];

for (const key of requiredEnvVars) {
  if (!firebaseConfig[key]) {
    isFirebaseProperlyConfigured = false; // Set to false if any required var is missing
    missingVars.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  }
}

if (!isFirebaseProperlyConfigured) {
  console.error(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
    "CRITICAL FIREBASE CONFIGURATION ERROR:\n" +
    "The following Firebase environment variables are MISSING or INVALID in your '.env.local' file:\n" +
    missingVars.join('\n') + '\n' +
    "Firebase features, especially Authentication and Firestore, WILL NOT WORK correctly.\n" +
    "This is the MOST COMMON CAUSE of 'auth/api-key-not-valid' errors.\n" +
    "Please ensure these environment variables are correctly set by copying them from your Firebase project settings.\n" +
    "Refer to the README.md for detailed instructions on setting up Firebase credentials.\n" +
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
}


if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
      "CRITICAL FIREBASE INITIALIZATION ERROR:", e.message + "\n" +
      "This usually means your Firebase configuration in '.env.local' is incorrect, incomplete, or the Firebase services (like Authentication) are not enabled in your Firebase project console.\n" +
      "Please verify ALL your NEXT_PUBLIC_FIREBASE_... variables in the .env.local file and ensure that Authentication (e.g., Email/Password sign-in) is ENABLED in the Firebase console.\n" +
      "Refer to the README.md for setup instructions.\n" +
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    );
    isFirebaseProperlyConfigured = false; 
    // We throw here because if Firebase itself can't initialize, the app is fundamentally broken.
    // The server will likely stop, or client-side will show Next.js error overlay.
    throw new Error("Firebase initialization failed due to missing or invalid configuration. App cannot start. Check .env.local and your Firebase project settings. See server console for details.");
  }
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

// Set auth persistence (example: local, session, or none)
// This is where 'rememberMe' functionality logic would tie in.
// For now, default to browserLocalPersistence.
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence to browserLocalPersistence:", error);
    });
}

// Example function to change persistence based on rememberMe, could be called from AuthProvider
export const setAuthPersistence = async (rememberMe: boolean) => {
  const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  // For a truly 'none' option if user unchecks rememberMe and was previously local:
  // const persistenceType = rememberMe ? browserLocalPersistence : inMemoryPersistence;
  try {
    await setPersistence(auth, persistenceType);
    console.log(`Auth persistence set to: ${rememberMe ? 'local' : 'session/memory'}`);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
};


export { app, auth, db };

/*
Conceptual Firestore Security Rules (to be applied in Firebase console or firebase.rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profile data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific orders stored under /userOrders/{userId}/orders/{orderId}
    match /userOrders/{userId}/orders/{orderId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific simulations stored under /userSimulations/{userId}/simulations/{simulationId}
    match /userSimulations/{userId}/simulations/{simulationId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific alerts stored under /userAlerts/{userId}/alerts/{alertId}
    match /userAlerts/{userId}/alerts/{alertId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // User-specific daily balance snapshots
    match /userDailyBalances/{userId}/snapshots/{snapshotId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Fallback rule: Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/