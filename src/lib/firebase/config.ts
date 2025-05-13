// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'; // Import setPersistence and browserLocalPersistence
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Set auth persistence to local by default (for "Remember me")
// This needs to be called before any auth operations if you want to ensure it applies globally.
// It can also be set dynamically during login.
if (typeof window !== 'undefined') { // Ensure this runs only on the client
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

    // User-specific orders stored under /userOrders/{userId}/orders/{orderId}
    match /userOrders/{userId}/orders/{orderId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      // allow create: if request.auth != null && request.auth.uid == userId
      //                 && request.resource.data.targetCrypto is string
      //                 && request.resource.data.quoteCurrency is string
      //                 && request.resource.data.amountOfTargetCryptoBought is number
      //                 && request.resource.data.buyPricePerUnit is number
      //                 && request.resource.data.totalBuyValueInQuote is number
      //                 && request.resource.data.buyCommissionInQuote is number
      //                 && request.resource.data.sellPricePerUnit is number
      //                 && request.resource.data.totalSellValueInQuote is number
      //                 && request.resource.data.sellCommissionInQuote is number
      //                 && request.resource.data.netProfitInQuote is number
      //                 && request.resource.data.originalPair is string
      //                 && request.resource.data.inputAmount is number
      //                 && request.resource.data.inputCurrency is string
      //                 && request.resource.data.timestamp == request.time;
      // allow update: if request.auth != null && request.auth.uid == userId; // Generally orders are immutable once created
    }

    // User-specific simulations stored under /userSimulations/{userId}/simulations/{simulationId}
    match /userSimulations/{userId}/simulations/{simulationId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      // allow create: if request.auth != null && request.auth.uid == userId
      //                 // Add specific field validations for simulationData
      //                 && request.resource.data.par_operacion is string
      //                 && request.resource.data.monto_compra_usdt is number
      //                 // ... other fields
      //                 && request.resource.data.fecha == request.time;
    }

    // User-specific alerts stored under /userAlerts/{userId}/alerts/{alertId}
    match /userAlerts/{userId}/alerts/{alertId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      // allow create: if request.auth != null && request.auth.uid == userId
      //                 && request.resource.data.symbol is string
      //                 && request.resource.data.targetPrice is number
      //                 && request.resource.data.direction is string && (request.resource.data.direction == 'above' || request.resource.data.direction == 'below')
      //                 && request.resource.data.active == true
      //                 && request.resource.data.createdAt == request.time
      //                 && request.resource.data.updatedAt == request.time;
      // allow update: if request.auth != null && request.auth.uid == userId
      //                 && (!('userId' in request.resource.data) || request.resource.data.userId == resource.data.userId) // userId cannot be changed
      //                 && (!('createdAt' in request.resource.data) || request.resource.data.createdAt == resource.data.createdAt) // createdAt cannot be changed
      //                 && request.resource.data.updatedAt == request.time;
    }

    // If you have a general 'alerts' collection (not user-specific), rules would be different.
    // This example assumes alerts are now user-specific based on path.
    // match /alerts/{alertId} {
    //   // Define rules for a general alerts collection if it exists and is used differently.
    //   // E.g., maybe only backend functions can write to it.
    //   allow read: if true; // Example: public read
    //   allow write: if false; // Example: no client writes
    // }


    // Fallback rule: Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/
