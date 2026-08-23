// Modern Art & Press - Firebase configuration
// এই ফাইলটি আপনার Firebase Web App configuration-এর জন্য।

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
  appId: "1:638080324810:web:4a4dd231fcf6f7512c5033",
  measurementId: "G-YYR6M30G7G"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// Demo authentication only.
// এটি OTP নয়। Production-এর secure phone-number-only login পরে server-side ব্যবস্থা দিয়ে করতে হবে.
async function ensureFirebaseUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export { firebaseApp, auth, db, storage, ensureFirebaseUser, onAuthStateChanged };
