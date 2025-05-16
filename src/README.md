
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Setup

This application requires Firebase credentials to function correctly for features like Firestore. **User authentication has been removed from this application.**

**VERY IMPORTANT: The `auth/api-key-not-valid` error (if encountered due to other Firebase services still using auth under the hood, though user-facing auth is removed) almost always means that your `NEXT_PUBLIC_FIREBASE_API_KEY` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (or other Firebase config values) are missing or incorrect in your `.env.local` file, OR your Firebase project is not correctly configured for web app usage (e.g., the API key is restricted). Please double-check the following steps carefully.**

1.  **Create a Firebase Project:** If you haven't already, create a project on the [Firebase Console](https://console.firebase.google.com/).
2.  **Add a Web App:** In your Firebase project, add a new Web application. If you already have one, ensure it's correctly configured.
3.  **Enable Firestore (if used):** In the Firebase console, navigate to "Firestore Database" (under Build) and enable it.
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

### Authorized Domains (Less Relevant Without OAuth)

Since user-facing authentication (especially OAuth like Google Sign-In) has been removed, the "Authorized domains" section in Firebase Authentication settings is less critical for the app's core functionality. However, if any underlying Firebase services still perform checks based on domain for API key usage, you might need to ensure your development (`localhost`) and deployment domains are listed.

## Firestore Security Rules (If Data Is Still User-Specific or Public)

**CRITICAL FOR OPERATION (if using Firestore): If you see "permission-denied" errors in your application, it means your Firestore Security Rules are not correctly set up in the Firebase Console.**

Even without user authentication, if you are storing data in Firestore (e.g., shared simulations, public alerts), you'll need appropriate security rules.
If data was previously user-specific, you'll need to decide how to manage access now.

**Example: Public Read, Admin Write (Adjust as needed)**
If you want to make all data publicly readable and only allow writes from a specific admin UID (or disable writes entirely from client):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Example: Make 'orders' collection publicly readable
    match /userOrders/{userId}/orders/{orderId} { // Path might need to be restructured if not user-specific
      allow read: if true; // Everyone can read
      allow write: if false; // No one can write from client (manage via backend/admin SDK)
    }
    // Example: Make 'simulations' publicly readable
    match /userSimulations/{userId}/simulations/{simulationId} { // Path might need to be restructured
      allow read: if true;
      allow write: if false;
    }
    // Example: Make 'alerts' publicly readable
    match /userAlerts/{userId}/alerts/{alertId} { // Path might need to be restructured
      allow read: if true;
      allow write: if false;
    }
    // User profiles are no longer relevant with auth removed.
    // match /users/{userId} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
    
    // Daily balances might still be relevant if stored generically
    match /userDailyBalances/{userId}/snapshots/{snapshotId} { // Path might need to be restructured
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
**You MUST deploy appropriate rules to your Firestore database based on your new data access model.**

1.  Go to your Firebase project in the Firebase Console.
2.  Navigate to "Firestore Database" (under Build).
3.  Click on the "Rules" tab.
4.  Replace the **entire** content of the rules editor with your new rules.
5.  Click **"Publish"**.

If you skip this step and are using Firestore, Firestore will likely block your application's attempts to read or write data.
If you still encounter "permission-denied" errors after deploying these rules, ensure your Firestore paths in your code match the rules and that you're not attempting client-side writes where `allow write: if false;` is set.
