importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCxZ-JcazpQmQ_y7Hm9xYeIkZMetBnEFJE",
  authDomain: "modern-art-press-8a01c.firebaseapp.com",
  projectId: "modern-art-press-8a01c",
  storageBucket: "modern-art-press-8a01c.firebasestorage.app",
  messagingSenderId: "638080324810",
  appId: "1:638080324810:web:a9bbbec9c122a2812c5033"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "নতুন বার্তা";
  const options = {
    body: payload.notification?.body || "একটি নতুন মেসেজ এসেছে।",
    icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png'
  };
  self.registration.showNotification(title, options);
});
