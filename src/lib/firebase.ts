// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "signal-v1-fc481.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "signal-v1-fc481",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "signal-v1-fc481.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "913459926537",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:913459926537:web:3f27082cdf1e913c444ad8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// For local development, connect to emulators
if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
  // Connect to Functions emulator (server-side only)
  import("firebase/functions").then(({ connectFunctionsEmulator }) => {
    try {
      connectFunctionsEmulator(functions, "localhost", 5001);
    } catch {
      console.log("Functions emulator already connected or not available");
    }
  });
}

export default app;
