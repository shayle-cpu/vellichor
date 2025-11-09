// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ✅ Your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBLIK9SYEvr-kxJ1a4Vr_k7mnMB0d5tSls",
  authDomain: "plottwist-dae1b.firebaseapp.com",
  projectId: "plottwist-dae1b",
  storageBucket: "plottwist-dae1b.firebasestorage.app",
  messagingSenderId: "1096940190974",
  appId: "1:1096940190974:web:b438e99a4dbf04cf2db9af",
  measurementId: "G-C7G0QRZYEQ"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export Firestore instance
export const db = getFirestore(app);
