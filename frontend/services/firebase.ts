import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA3hrYvu-qRCDnrH6AfN-du7ZSJV6HPchU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "plataformamonity-fc8fa.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "plataformamonity-fc8fa",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "plataformamonity-fc8fa.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "666457680282",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:666457680282:web:20efbc2e0a604a46e63223",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-7DWER4LF8C"
};
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
