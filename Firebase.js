import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config is loaded from environment variables.
// Copy .env.example → .env and fill in your values for local development.
// On Replit, set these in the Secrets / Environment Variables panel.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Guard: warn clearly if any required key is missing
const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(
    "[Firebase] Missing env variables:",
    missing.join(", "),
    "\nAdd them to your .env file or Replit Secrets panel."
  );
}

const app       = initializeApp(firebaseConfig);
const db        = getFirestore(app);
const analytics = getAnalytics(app);
const storage   = getStorage(app);

export { db, app, analytics, storage };
