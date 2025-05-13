
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Setup

This application requires Firebase credentials to function correctly.

1.  **Create a Firebase Project:** If you haven't already, create a project on the [Firebase Console](https://console.firebase.google.com/).
2.  **Add a Web App:** In your Firebase project, add a new Web application.
3.  **Get Firebase Config:** After adding the web app, Firebase will provide you with a `firebaseConfig` object. It looks something like this:

    ```javascript
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "your-project-id.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project-id.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef1234567890"
    };
    ```
4.  **Create a `.env.local` file:** In the root of your project, create a file named `.env.local`.
5.  **Add Environment Variables:** Copy the values from your `firebaseConfig` object into the `.env.local` file, prefixing each key with `NEXT_PUBLIC_`. Refer to the `.env.example` file for the correct format:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    # NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_FIREBASE_MEASUREMENT_ID (Optional)
    ```

6.  **Restart your development server:** After creating or modifying the `.env.local` file, you need to restart your Next.js development server for the changes to take effect.

If you plan to use Genkit AI features that rely on Google AI (like Gemini), you will also need to set the `GOOGLE_API_KEY` in your `.env.local` file.

```env
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
```

**Important:** Never commit your `.env.local` file (or any file containing sensitive credentials) to version control. The `.gitignore` file should already include `.env*.local`.
