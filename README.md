
The error "Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)" indicates that the Firebase API key used by the application is invalid, missing, or not correctly configured for the Firebase project.

The application's codebase already includes several checks and guidance mechanisms for this common issue:

1.  **Environment Variable Checks (`src/lib/firebase/config.ts`)**: The application checks if essential Firebase environment variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) are present in the `.env.local` file. If any of these are missing, a flag `isFirebaseProperlyConfigured` is set to `false`.
2.  **UI Warnings for Missing Configuration (`src/components/auth/login-form.tsx`, `src/components/auth/signup-form.tsx`)**: If `isFirebaseProperlyConfigured` is `false`, the login and signup forms display a prominent warning message, guiding the user to check their `.env.local` file and the `src/README.md` for setup instructions. Firebase operations are disabled in this state.
3.  **Specific Toasts for Firebase SDK Errors**: If the essential environment variables are present but the API key is still rejected by Firebase (e.g., it's the wrong key, it's restricted, or the Firebase Authentication service isn't enabled/configured correctly in the Firebase console), the Firebase SDK itself will throw the `auth/api-key-not-valid` error. This error is caught by the application, and a toast notification is displayed, specifically mentioning that the Firebase API Key is invalid and advising the user to check their `.env.local` file and Firebase project settings.
4.  **Detailed README Instructions (`src/README.md`)**: The `src/README.md` file provides comprehensive step-by-step instructions on how to:
    *   Create a Firebase project.
    *   Add a Web App to the project.
    *   **Enable Authentication methods (e.g., Email/Password) in the Firebase console.** This is a crucial step.
    *   Obtain the `firebaseConfig` object.
    *   Create a `.env.local` file.
    *   Correctly populate the `.env.local` file with `NEXT_PUBLIC_` prefixed variables from the `firebaseConfig`.
    *   Restart the development server.
    The `src/README.md` also explicitly states that the `auth/api-key-not-valid` error is typically due to incorrect `.env.local` values or Firebase project configuration.

**CRITICAL: If you encounter "permission-denied" errors when trying to access Firestore data (e.g., user profiles, orders, alerts), it is ABSOLUTELY CRITICAL that you have the correct Firestore Security Rules deployed in your Firebase project console. Refer to the "Firestore Security Rules" section in `src/README.md` for the rules that MUST be deployed.**

Given these existing measures, no further code changes within the application are required to address this specific error. The solution lies in the user meticulously following the setup instructions in the `src/README.md` to ensure their Firebase project is correctly configured and that their `.env.local` file contains the correct and valid credentials, and that Firestore Security Rules are correctly deployed.

The error message in the screenshot ("Falló el Inicio de Sesión Firebase: Error (auth/api-key-not-valid...)") confirms that the application *is* attempting a Firebase operation (login), but Firebase is rejecting the API key. This means the problem is external to the application's current code logic for handling configuration, as the error originates from the Firebase backend due to an invalid key.

**Recommendation to the user:**

Please carefully review and follow the "Environment Setup" and "Firestore Security Rules" sections in the `src/README.md` file. Pay close attention to:
1.  Ensuring **Authentication is enabled** in your Firebase project console (under Build &gt; Authentication &gt; Sign-in method). At least one provider (like Email/Password) must be enabled.
2.  Double-checking that **all `NEXT_PUBLIC_FIREBASE_...` variables** in your `.env.local` file are copied exactly from your Firebase project settings.
3.  Ensuring there are **no typos** in the variable names or their values in the `.env.local` file.
4.  **Restarting your Next.js development server** after any changes to the `.env.local` file.
5.  Verifying that your Firebase API key does not have any restrictions (e.g., HTTP referrer restrictions) that would prevent it from being used from `localhost` or your deployment domain.
6.  **Deploying the correct Firestore Security Rules** to your Firebase project as detailed in `src/README.md`.

---
## Firestore Security Rules (Mandatory)

**If you are seeing "permission-denied" errors when the application tries to read or write data (like user profiles, orders, or alerts), it means your Firestore Security Rules are not set up correctly in the Firebase Console.**

You **MUST** deploy the following rules to your Firestore database:

1.  Go to your Firebase project in the Firebase Console.
2.  Navigate to "Firestore Database" (under Build).
3.  Click on the "Rules" tab.
4.  Replace the **entire** content of the rules editor with the following:

```
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

    // Fallback rule: Deny all other access by default for security.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5.  Click **"Publish"**.

If you skip this step, Firestore will block your application's attempts to read or write data, leading to errors and a non-functional application.
For more detailed Firebase setup instructions, please refer to `src/README.md`.
---
