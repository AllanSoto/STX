
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Setup

This application requires Firebase credentials to function correctly.

**VERY IMPORTANT: The `auth/api-key-not-valid` error almost always means that your `NEXT_PUBLIC_FIREBASE_API_KEY` or `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (or other Firebase config values) are missing or incorrect in your `.env.local` file, or your Firebase project is not correctly configured for web app usage (e.g., the API key is restricted or the Authentication service is not enabled). Please double-check these steps carefully.**

1.  **Create a Firebase Project:** If you haven't already, create a project on the [Firebase Console](https://console.firebase.google.com/).
2.  **Add a Web App:** In your Firebase project, add a new Web application. If you already have one, ensure it's correctly configured.
3.  **Enable Authentication:** In the Firebase console, navigate to "Authentication" (under Build) and ensure at least one sign-in method (e.g., Email/Password) is enabled.
4.  **Get Firebase Config:** After adding the web app (or selecting an existing one), Firebase will provide you with a `firebaseConfig` object. You can find this in your Project settings (click the gear icon next to "Project Overview", then scroll down to "Your apps"). It looks something like this:

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
6.  **Add Environment Variables:** Copy the values from your `firebaseConfig` object into the `.env.local` file, prefixing each key with `NEXT_PUBLIC_`. Refer to the `.env.example` file for the correct format if one exists, otherwise use the following:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID (Optional)
    ```
    **Ensure there are no typos and that the values are copied exactly as they appear in your Firebase project settings.**

7.  **Restart your development server:** After creating or modifying the `.env.local` file, you **must** restart your Next.js development server for the changes to take effect.

If you plan to use Genkit AI features that rely on Google AI (like Gemini), you will also need to set the `GOOGLE_API_KEY` in your `.env.local` file.

```env
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
```

**Important:** Never commit your `.env.local` file (or any file containing sensitive credentials) to version control. The `.gitignore` file should already include `.env*.local`.
