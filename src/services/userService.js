import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const usersRef = collection(db, 'users');

// Create the user profile document right after sign up
export async function createUserProfile(uid, { username, email, photoURL = '' }) {
  await setDoc(doc(db, 'users', uid), {
    id: uid,
    username,
    usernameLower: username.toLowerCase(),
    email,
    photoURL,
    bio: 'Hey there! I am using HeavenAyn.',
    online: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export function subscribeToUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function updateUserProfile(uid, data) {
  const payload = { ...data };
  if (payload.username) payload.usernameLower = payload.username.toLowerCase();
  await updateDoc(doc(db, 'users', uid), payload);
}

export async function setOnlineStatus(uid, online) {
  if (!uid) return;
  await updateDoc(doc(db, 'users', uid), {
    online,
    lastSeen: serverTimestamp(),
  });
}

// Real-time list of all users except the current one
export function subscribeToAllUsers(currentUid, callback) {
  const q = query(usersRef, orderBy('username'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs
      .map((d) => d.data())
      .filter((u) => u.id !== currentUid);
    callback(users);
  });
}

// Client-side search filter (simple contains search on username/email)
export function filterUsers(users, searchTerm) {
  if (!searchTerm.trim()) return users;
  const term = searchTerm.toLowerCase();
  return users.filter(
    (u) =>
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
  );
}
