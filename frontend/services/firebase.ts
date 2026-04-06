import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA3hrYvu-qRCDnrH6AfN-du7ZSJV6HPchU",
  authDomain: "plataformamonity-fc8fa.firebaseapp.com",
  projectId: "plataformamonity-fc8fa",
  storageBucket: "plataformamonity-fc8fa.firebasestorage.app",
  messagingSenderId: "666457680282",
  appId: "1:666457680282:web:20efbc2e0a604a46e63223",
  measurementId: "G-7DWER4LF8C"
};
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);