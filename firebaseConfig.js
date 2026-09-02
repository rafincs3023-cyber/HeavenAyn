// firebaseConfig.js
// ---------------------------------------------------------------------------
// 1. Go to https://console.firebase.google.com -> Create a project
// 2. Add a Web App (</> icon) inside the project to get this config object
// 3. Enable Authentication -> Sign-in method -> Email/Password
// 4. Enable Firestore Database (start in production mode, add rules later)
// 5. Enable Storage
// 6. Paste your config values below
// ---------------------------------------------------------------------------
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyBgnAjG5hEaK93kXBy-onjx0JOp20O-U24',
  authDomain: 'chat-app-e7898.firebaseapp.com',
  projectId: 'chat-app-e7898',
  storageBucket: 'chat-app-e7898.firebasestorage.app',
  messagingSenderId: '787466489841',
  appId: '1:787466489841:web:18d39cf13cb75191fa3e50',
  measurementId: 'G-1T92XE1JB0',
};

// Avoid re-initializing during fast refresh
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth: use AsyncStorage persistence on native so the user stays logged in
// after closing/reopening the app. On web, fall back to default getAuth.
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // initializeAuth throws if it was already called (e.g. Fast Refresh)
    auth = getAuth(app);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
