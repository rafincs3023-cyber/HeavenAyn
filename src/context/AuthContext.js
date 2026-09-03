import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_ACCOUNTS_KEY = 'heavenayn:savedAccounts';

// Keep a local list of accounts that have signed in on this device before,
// so the user can quickly switch between them (email is prefilled on Login).
async function rememberAccount({ uid, email, username }) {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((a) => a.uid !== uid);
    filtered.unshift({ uid, email, username });
    await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered.slice(0, 8)));
  } catch (e) {
    // non-fatal
  }
}
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import {
  createUserProfile,
  getUserProfile,
  setOnlineStatus,
  subscribeToUserProfile,
} from '../services/userService';

const AuthContext = createContext();

// Friendly messages instead of raw Firebase error codes
function mapAuthError(error) {
  const code = error?.code || '';
  const map = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
  };
  return map[code] || error?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // firebase auth user
  const [profile, setProfile] = useState(null); // firestore user doc
  const [initializing, setInitializing] = useState(true);
  const [pendingPrefillEmail, setPendingPrefillEmail] = useState(null);
  const profileUnsubRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (firebaseUser) {
        setOnlineStatus(firebaseUser.uid, true).catch(() => {});
        profileUnsubRef.current = subscribeToUserProfile(firebaseUser.uid, setProfile);
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  // Track app foreground/background to update online status + lastSeen
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!user) return;
      if (nextState === 'active') {
        setOnlineStatus(user.uid, true);
      } else {
        setOnlineStatus(user.uid, false);
      }
    });
    return () => subscription.remove();
  }, [user]);

  async function register(username, email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: username });
      await createUserProfile(cred.user.uid, { username, email });
      await rememberAccount({ uid: cred.user.uid, email, username });
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  }

  async function login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await rememberAccount({
        uid: cred.user.uid,
        email: cred.user.email,
        username: cred.user.displayName || email,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  }

  async function logout() {
    try {
      // Best-effort: a failed presence write must never keep the user signed in.
      if (user) await setOnlineStatus(user.uid, false).catch(() => {});
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  }

  async function forgotPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  }

  async function getSavedAccounts() {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return list;
    } catch (e) {
      return [];
    }
  }

  async function removeSavedAccount(uid) {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ACCOUNTS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(list.filter((a) => a.uid !== uid)));
    } catch (e) {
      // non-fatal
    }
  }

  // Log out of the current account so another one can be signed into
  // (used by the "Switch Account" flow on the Profile screen). If an email
  // is passed, the Login screen will have it prefilled once it mounts.
  async function switchAccount(email) {
    setPendingPrefillEmail(email || null);
    return logout();
  }

  function clearPendingPrefillEmail() {
    setPendingPrefillEmail(null);
  }

  const value = {
    user,
    profile,
    initializing,
    register,
    login,
    logout,
    forgotPassword,
    getSavedAccounts,
    removeSavedAccount,
    switchAccount,
    pendingPrefillEmail,
    clearPendingPrefillEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
