/**
 * Firebase web settings come from VITE_FIREBASE_* variables (see .env.example).
 * They identify the project and are not secrets; the Firestore rules are what protect the data.
 * With no settings the app runs signed-out only and the sign-in button is hidden.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)
