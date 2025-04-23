// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCa4IVNZWaW41Lt-zm4TzKvURv2q4qM6io",
    authDomain: "storeshop-1b056.firebaseapp.com",
    projectId: "storeshop-1b056",
    storageBucket: "storeshop-1b056.firebasestorage.app",
    messagingSenderId: "621075712142",
    appId: "1:621075712142:web:62347e94419db8e36ca1df",
    measurementId: "G-ZPRGDHWYVS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };