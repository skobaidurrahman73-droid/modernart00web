// Modern Art & Press - Firebase configuration
// এই ফাইলটি আপনার Firebase Web App configuration-এর জন্য।
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxZ-JcazpQmQ_y7Hm9xYeIkZMetBnEFJE",
  authDomain: "modern-art-press-8a01c.firebaseapp.com",
  projectId: "modern-art-press-8a01c",
  storageBucket: "modern-art-press-8a01c.firebasestorage.app",
  messagingSenderId: "638080324810",
  appId: "1:638080324810:web:a9bbbec9c122a2812c5033",
  measurementId: "G-TLGD1JDRVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Demo authentication only.
// এটি OTP নয়। Production-এর secure phone-number-only login পরে server-side ব্যবস্থা দিয়ে করতে হবে.
async function ensureFirebaseUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

export { firebaseApp, auth, db, storage, ensureFirebaseUser, onAuthStateChanged };
