// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDBwywkwEMIxvE2JoGXztImZ8D7csC5hUo",
  authDomain: "women-saftey-10c68.firebaseapp.com",
  projectId: "women-saftey-10c68",
  storageBucket: "women-saftey-10c68.firebasestorage.app",
  messagingSenderId: "964655795379",
  appId: "1:964655795379:web:46211570f36e7d4e9534c6",
  measurementId: "G-5VG693D4C3",
  databaseURL: "https://women-saftey-10c68-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const realDb = getDatabase(app);
const auth = getAuth(app);

export { db, realDb, auth, app };