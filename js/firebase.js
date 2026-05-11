// =============================================
// Firebase v12 · LUXE Barber — Single source
// =============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

export const firebaseConfig = {
  apiKey:            "AIzaSyC2fqog1_PRGpaTlyUvWkryM96QhLpGdW0",
  authDomain:        "ben-snof.firebaseapp.com",
  projectId:         "ben-snof",
  storageBucket:     "ben-snof.firebasestorage.app",
  messagingSenderId: "127646894375",
  appId:             "1:127646894375:web:848988f11bd4afef03c102"
};

export const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Keep user logged in across sessions
setPersistence(auth, browserLocalPersistence).catch(console.warn);

export {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp,
  ref, uploadBytes, getDownloadURL, deleteObject
};

export const currentUser = () => auth.currentUser;