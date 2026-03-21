// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZ-HEbjGAy6gKPXxFcrdNwKypVk2NXv2A",
  authDomain: "mlmbooster.firebaseapp.com",
  projectId: "mlmbooster",
  storageBucket: "mlmbooster.firebasestorage.app",
  messagingSenderId: "649090963301",
  appId: "1:649090963301:web:83247d75d046e6fb46b38c",
  measurementId: "G-C3FTH3Q87N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const analytics = getAnalytics(app); 
const storage = getStorage(app);

// Export
export { db, app, analytics,storage };
