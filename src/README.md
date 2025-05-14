
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Setup

This application requires Firebase credentials to function correctly.

**VERY IMPORTANT: The `auth/api-key-not-valid` error almost always means that your `NEXT_PUBLIC_FIREBASE_API_KEY` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (or other Firebase config values) are missing or incorrect in your `.env.local` file, OR your Firebase project is not correctly configured for web app usage (e.g., the API key is restricted or the Authentication service is not enabled/configured with sign-in methods). Please double-check the following steps carefully.**

1.  **Create a Firebase Project:** If you haven't already, create a project on the [Firebase Console](https://console.firebase.google.com/).
2.  **Add a Web App:** In your Firebase project, add a new Web application. If you already have one, ensure it's correctly configured.
3.  **Enable Authentication:** In the Firebase console, navigate to "Authentication" (under Build), go to the "Sign-in method" tab, and **ENSURE AT LEAST ONE SIGN-IN PROVIDER (e.g., Email/Password) IS ENABLED.** This is a very common cause for the `auth/api-key-not-valid` error, especially if the API key itself is correct but no sign-in methods are active.
4.  **Get Firebase Config:** After adding the web app (or selecting an existing one), Firebase will provide you with a `firebaseConfig` object. You can find this in your Project settings (click the gear icon next to "Project Overview", then scroll down to "Your apps", and select your web app). It looks something like this:

    ```javascript
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef1234567890",
      measurementId: "G-XXXXXXXXXX" // Optional
    };
    ```
5.  **Create a `.env.local` file:** In the root of your project, create a file named `.env.local`.
6.  **Add Environment Variables:** Copy ALL relevant values from your `firebaseConfig` object into the `.env.local` file, prefixing each key with `NEXT_PUBLIC_`. Refer to the `.env.example` file for the correct format if one exists, otherwise use the following structure:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID (Optional)
    ```
    **Ensure there are no typos and that the values are copied exactly as they appear in your Firebase project settings.** Some values like `storageBucket` might be empty if not used, but `apiKey`, `authDomain`, and `projectId` are crucial.

7.  **Restart your development server:** After creating or modifying the `.env.local` file, you **must** restart your Next.js development server for the changes to take effect.

If you plan to use Genkit AI features that rely on Google AI (like Gemini), you will also need to set the `GOOGLE_API_KEY` in your `.env.local` file.

```env
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
```

**Important:** Never commit your `.env.local` file (or any file containing sensitive credentials) to version control. The `.gitignore` file should already include `.env*.local`.

## Firestore Security Rules

**CRITICAL FOR OPERATION: If you see "permission-denied" errors in your application (e.g., when trying to load user data, save orders, or manage alerts), it almost certainly means your Firestore Security Rules are not correctly set up in the Firebase Console.**

The application relies on specific Firestore security rules to ensure that users can only access and modify their own data.

**You MUST deploy the following rules to your Firestore database:**

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
If you still encounter "permission-denied" errors after deploying these rules, ensure:
- You are correctly logged in within the application.
- The `userId` in your Firestore paths matches the `request.auth.uid` of the logged-in user.
- There are no typos in collection or document paths in your code or rules.
- You have refreshed your application or cleared any local cache that might be holding onto old data or auth state.
