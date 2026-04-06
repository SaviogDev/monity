import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBOZJNwRlNJlr2PkUMG2l_M32Hz-qJVYxA",
  authDomain: "monity-76ab7.firebaseapp.com",
  projectId: "monity-76ab7",
  storageBucket: "monity-76ab7.firebasestorage.app",
  messagingSenderId: "813333528031",
  appId: "1:813333528031:web:4a05c184e464ba97f3d86a",
  measurementId: "G-51TGE1CJPN"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);