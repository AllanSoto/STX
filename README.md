rebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)" indicates that the Firebase API key used by the application is invalid, missing, or not correctly configured for the Firebase project.

**Note: User authentication has been removed from this application. However, an invalid API key can still affect other Firebase services like Firestore if they rely on it.**

The application's codebase includes checks for Firebase configuration:

1.  **Environment Variable Checks (`src/lib/firebase/config.ts`)**: The application checks if essential Firebase environment variables (`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) are present in the `.env.local` file. If any of these are missing, a flag `isFirebaseProperlyConfigured` is set to `false`.
2.  **UI Warnings for Missing Configuration**: If `isFirebaseProperlyConfigured` is `false`, relevant components might display warnings or disable functionality.
3.  **Detailed README Instructions (`src/README.md`)**: The `src/README.md` file provides comprehensive step-by-step instructions on how to:
    *   Create a Firebase project.
    *   Add a Web App to the project.
    *   Obtain the `firebaseConfig` object.
    *   Create a `.env.local` file.
    *   Correctly populate the `.env.local` file with `NEXT_PUBLIC_` prefixed variables from the `firebaseConfig`.
    *   Restart the development server.
    The `src/README.md` also explicitly states that the `auth/api-key-not-valid` error is typically due to incorrect `.env.local` values or Firebase project configuration.

**CRITICAL: If you encounter "permission-denied" errors when trying to access Firestore data, it is ABSOLUTELY CRITICAL that you have the correct Firestore Security Rules deployed in your Firebase project console. Refer to the "Firestore Security Rules" section in `src/README.md` for guidance on rules that MUST be deployed, considering authentication has been removed.**

Given these existing measures, no further code changes within the application are required to address this specific error beyond what has already been done to handle `isFirebaseProperlyConfigured`. The solution lies in the user meticulously following the setup instructions in the `src/README.md` to ensure their Firebase project is correctly configured and that their `.env.local` file contains the correct and valid credentials, and that Firestore Security Rules are correctly deployed for the new non-authenticated access model.

**Recommendation to the user:**

Please carefully review and follow the "Environment Setup" and "Firestore Security Rules" sections in the `src/README.md` file. Pay close attention to:
1.  Double-checking that **all `NEXT_PUBLIC_FIREBASE_...` variables** in your `.env.local` file are copied exactly from your Firebase project settings.
2.  Ensuring there are **no typos** in the variable names or their values in the `.env.local` file.
3.  **Restarting your Next.js development server** after any changes to the `.env.local` file.
4.  Verifying that your Firebase API key does not have any restrictions (e.g., HTTP referrer restrictions) that would prevent it from being used from `localhost` or your deployment domain.
5.  **Deploying the correct Firestore Security Rules** to your Firebase project as detailed in `src/README.md`, reflecting the removal of user authentication.

---
## Firestore Security Rules (Mandatory if using Firestore)

**If you are seeing "permission-denied" errors when the application tries to read or write data, it means your Firestore Security Rules are not set up correctly in the Firebase Console.**

With user authentication removed, your Firestore rules need to change. You can no longer rely on `request.auth.uid`. You must decide how data should be accessed:
- **Publicly readable?**
- **Writable by anyone (generally not recommended for client-side)?**
- **Writable only via backend/admin SDK?**

Below is an **EXAMPLE** of rules that make data publicly readable and disallow client-side writes. **You MUST adapt these to your specific needs.**

1.  Go to your Firebase project in the Firebase Console.
2.  Navigate to "Firestore Database" (under Build).
3.  Click on the "Rules" tab.
4.  Replace the **entire** content of the rules editor with something like the following (ADAPT THIS!):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Example for orders - now public read, no client write
    match /userOrders/{document=**} { // Path might need to change if not user-specific
      allow read: if true;
      allow write: if false; // Or specific admin logic
    }

    // Example for simulations - now public read, no client write
    match /userSimulations/{document=**} { // Path might need to change
      allow read: if true;
      allow write: if false;
    }

    // Example for alerts - now public read, no client write
    match /userAlerts/{document=**} { // Path might need to change
      allow read: if true;
      allow write: if false;
    }

    // Fallback rule: Deny all other access by default for security.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

5.  Click **"Publish"**.

If you skip this step and are using Firestore, Firestore will block your application's attempts to read or write data.
For more detailed Firebase setup instructions, please refer to `src/README.md`.
---
