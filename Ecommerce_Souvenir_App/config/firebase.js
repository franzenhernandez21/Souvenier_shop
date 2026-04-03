import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyC7_VQOElzcuadF4OvLgVMsFNFzURfAe2I",
  authDomain: "e-commerce-souvenir-app.firebaseapp.com",
  projectId: "e-commerce-souvenir-app",
  storageBucket: "e-commerce-souvenir-app.firebasestorage.app",
  messagingSenderId: "886000683110",
  appId: "1:886000683110:web:aa8a821d7849d66e2f45a7",
  measurementId: "G-QCMDH8KKBL"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);