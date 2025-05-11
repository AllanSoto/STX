// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

export { app, auth, db };

/*
Conceptual Firestore Security Rules for 'alerts' collection (to be applied in Firebase console or firebase.rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Alerts: Users can only CRUD their own alerts.
    // Public read is disallowed.
    match /alerts/{alertId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid
                    && request.resource.data.symbol is string
                    && request.resource.data.targetPrice is number
                    && request.resource.data.direction is string && (request.resource.data.direction == 'above' || request.resource.data.direction == 'below')
                    && request.resource.data.active == true
                    && request.resource.data.createdAt == request.time
                    && request.resource.data.updatedAt == request.time;
      allow update: if request.auth != null && request.auth.uid == resource.data.userId
                    && (!('userId' in request.resource.data) || request.resource.data.userId == resource.data.userId) // userId cannot be changed
                    && (!('createdAt' in request.resource.data) || request.resource.data.createdAt == resource.data.createdAt) // createdAt cannot be changed
                    && request.resource.data.updatedAt == request.time;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Other collections (ensure they also have appropriate rules)
    // Example for user-specific data:
    // match /HistorialDeOrdenes/{userId}/{document=**} {
    //  allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
    // match /simulaciones/{simulationId} {
    // allow read, write: if request.auth != null && request.auth.uid == request.resource.data.usuario_id;
    // }
    // match /portfolioSnapshots/{userId}/{document=**} {
    // allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
  }
}

*/
