// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
let app;
if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      "CRITICAL FIREBASE CONFIGURATION ERROR: \n" +
      "NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or invalid.\n" +
      "Firebase features will NOT work correctly.\n" +
      "Please ensure these environment variables are correctly set in your '.env.local' file.\n" +
      "Refer to the README.md for instructions on setting up Firebase credentials."
    );
    // Initialize with potentially incomplete config; Firebase SDK will throw specific errors for operations.
  }
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("CRITICAL FIREBASE INITIALIZATION ERROR:", e);
    console.error(
      "This usually means your Firebase configuration in '.env.local' is incorrect or incomplete. " +
      "Please verify your API key, Project ID, and other settings in the Firebase console and your .env.local file."
    );
    // App will likely be unusable if Firebase fails to initialize.
  }
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence to local by default (for "Remember me")
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting auth persistence:", error);
    });
}

export { app, auth, db };

/*
Conceptual Firestore Security Rules (to be applied in Firebase console or firebase.rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User profile data
    match /users/{userId} {
      allow read, write, update, delete: if request.auth != null && request.auth.uid == userId;
      // allow create: if request.auth != null && request.auth.uid == userId; // create is covered by write
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

    // Fallback rule: Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/
