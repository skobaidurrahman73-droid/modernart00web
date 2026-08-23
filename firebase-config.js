import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxZ-JcazpQmQ_y7Hm9xYeIkZMetBnEFJE",
  authDomain: "modern-art-press-8a01c.firebaseapp.com",
  projectId: "modern-art-press-8a01c",
  storageBucket: "modern-art-press-8a01c.firebasestorage.app",
  messagingSenderId: "638080324810",
  appId: "1:638080324810:web:a9bbbec9c122a2812c5033",
  measurementId: "G-TLGD1JDRVP"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

window.firebaseApp = firebaseApp;
window.auth = auth;
window.db = db;
window.storage = storage;

async function ensureFirebaseUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export { firebaseApp, auth, db, storage, ensureFirebaseUser, onAuthStateChanged };
