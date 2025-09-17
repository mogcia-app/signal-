// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvX4cKWKtn_qnh3CV-d1UC4GEiVpdPB9w",
  authDomain: "signal-v1-fc481.firebaseapp.com",
  projectId: "signal-v1-fc481",
  storageBucket: "signal-v1-fc481.firebasestorage.app",
  messagingSenderId: "913459926537",
  appId: "1:913459926537:web:3f27082cdf1e913c444ad8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// For local development, connect to emulators
if (process.env.NODE_ENV === 'development') {
  // Connect to Functions emulator
  import('firebase/functions').then(({ connectFunctionsEmulator }) => {
    if (!functions._delegate._region) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  });
}

export default app;
