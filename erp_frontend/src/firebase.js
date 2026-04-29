// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpIXw8aoa1brCMPPLi8uaWYL3YWhxHWk8",
  authDomain: "landing-page-5cfbb.firebaseapp.com",
  projectId: "landing-page-5cfbb",
  storageBucket: "landing-page-5cfbb.firebasestorage.app",
  messagingSenderId: "665258150092",
  appId: "1:665258150092:web:7ce627d57509d06ec89a69",
  measurementId: "G-YPB196GTBV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, analytics };
