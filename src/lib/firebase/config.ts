
// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';

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
];

let missingVars: string[] = [];

for (const key of requiredEnvVars) {
  if (!firebaseConfig[key]) {
    isFirebaseProperlyConfigured = false;
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


if (isFirebaseProperlyConfigured) { // Only attempt to initialize if basic config seems present
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
      // Do NOT throw an error here to prevent server crash.
      // The application will rely on isFirebaseProperlyConfigured being false.
    }
  } else {
    app = getApp();
  }

  if (isFirebaseProperlyConfigured && app!) { // Ensure app was initialized
    auth = getAuth(app);
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
      console.log("Firestore initialized with persistent local cache.");
    } catch (e: any) {
      console.warn("Error initializing Firestore with persistence, falling back to default:", e);
      isFirebaseProperlyConfigured = false; // Mark as not fully configured if Firestore init fails
      // Attempt to get a non-persistent instance if persistent fails but app is valid
      try {
        db = getFirestore(app);
      } catch (dbError) {
        console.error("CRITICAL: Failed to initialize Firestore even without persistence:", dbError);
        // At this point, db might be undefined, components should handle this.
      }
    }
  }
}

// Ensure auth and db are assigned default/null values if not configured
if (!isFirebaseProperlyConfigured) {
  // @ts-ignore
  if (!auth) auth = null;
  // @ts-ignore
  if (!db) db = null;
}


if (typeof window !== 'undefined' && auth) {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence to browserLocalPersistence:", error);
    });
}

export const setAuthPersistence = async (rememberMe: boolean) => {
  if (typeof window !== 'undefined' && auth) {
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    try {
      await setPersistence(auth, persistenceType);
      console.log(`Auth persistence set to: ${rememberMe ? 'local' : 'session/memory'}`);
    } catch (error) {
      console.error("Error setting auth persistence:", error);
    }
  }
};


export { app, auth, db };

/*
==========================================================================================
IMPORTANT: FIREBASE FIRESTORE SECURITY RULES
==========================================================================================
The following rules are essential for the application to function correctly.
You MUST copy and paste these rules into your Firebase project's
Firestore Security Rules editor and PUBLISH them.

Failure to do so will result in "permission-denied" errors when users try to
access or modify their data.

To apply these rules:
1. Go to your Firebase project in the Firebase Console.
2. Navigate to "Firestore Database" (under Build).
3. Click on the "Rules" tab.
4. Replace the existing rules with the content below.
5. Click "Publish".

--- START OF RULES TO COPY ---
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profile data:
    // Allows a user to read and write to their own document in the 'users' collection.
    // This is crucial for fetching user details after login and for updating profile information.
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific orders:
    // Allows a user to manage (read, write, delete) their own orders.
    match /userOrders/{userId}/orders/{orderId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific simulations:
    // Allows a user to manage their own simulations.
    match /userSimulations/{userId}/simulations/{simulationId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }

    // User-specific alerts:
    // Allows a user to manage their own price alerts.
    match /userAlerts/{userId}/alerts/{alertId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // User-specific daily balance snapshots:
    // Allows a user to read and write their own daily balance snapshots.
    match /userDailyBalances/{userId}/snapshots/{snapshotId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Fallback rule: Deny all other access by default for security.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
--- END OF RULES TO COPY ---
==========================================================================================
*/
