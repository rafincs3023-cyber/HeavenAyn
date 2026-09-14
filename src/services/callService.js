import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import uuid from 'react-native-uuid';
import { app, db } from '../../firebaseConfig';
import { AGORA_USE_TOKEN } from '../config/agoraConfig';

const callsRef = collection(db, 'calls');

// Call lifecycle:  ringing -> accepted -> ended
//                  ringing -> declined            (callee rejects)
//                  ringing -> cancelled           (caller hangs up first)
//                  ringing -> missed              (nobody answered in time)
export const CALL_STATUS = {
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  MISSED: 'missed',
  ENDED: 'ended',
};

const TERMINAL_STATUSES = [
  CALL_STATUS.DECLINED,
  CALL_STATUS.CANCELLED,
  CALL_STATUS.MISSED,
  CALL_STATUS.ENDED,
];

export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

// Create the call document. The Agora channel name is just the call id, so
// both participants derive the same channel without extra coordination.
export async function createCall({ caller, callee, type }) {
  const callId = String(uuid.v4());
  const payload = {
    callId,
    channelName: callId,
    type, // 'audio' | 'video'
    status: CALL_STATUS.RINGING,
    callerId: caller.id,
    callerName: caller.username || 'Unknown',
    callerPhoto: caller.photoURL || '',
    calleeId: callee.id,
    calleeName: callee.username || 'Unknown',
    calleePhoto: callee.photoURL || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    endedAt: null,
  };
  await setDoc(doc(db, 'calls', callId), payload);
  return { callId, ...payload };
}

export async function updateCallStatus(callId, status, extra = {}) {
  if (!callId) return;
  const patch = { status, updatedAt: serverTimestamp(), ...extra };
  if (isTerminalStatus(status)) patch.endedAt = serverTimestamp();
  await updateDoc(doc(db, 'calls', callId), patch);
}

// Live listener on a single call document (used by CallScreen).
export function subscribeToCall(callId, callback) {
  return onSnapshot(doc(db, 'calls', callId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// Global listener: fires whenever someone starts ringing THIS user. Stale
// docs (app was closed when the call came in) are filtered out by age so the
// user isn't ambushed by an "incoming call" that already timed out.
export function subscribeToIncomingCalls(uid, callback, maxAgeMs = 60000) {
  const q = query(
    callsRef,
    where('calleeId', '==', uid),
    where('status', '==', CALL_STATUS.RINGING)
  );
  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const fresh = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => {
        const createdMs = c.createdAt?.toMillis?.() ?? now;
        return now - createdMs < maxAgeMs;
      })
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    callback(fresh[0] || null);
  });
}

// Ask the backend for a short-lived Agora RTC token. Returns null when tokens
// are disabled or the function isn't deployed — CallScreen then joins with an
// empty token (fine while the Agora project is in testing mode).
export async function fetchAgoraToken(channelName, agoraUid) {
  if (!AGORA_USE_TOKEN) return null;
  try {
    const functions = getFunctions(app);
    const callable = httpsCallable(functions, 'getAgoraToken');
    const res = await callable({ channelName, uid: agoraUid });
    return res?.data?.token || null;
  } catch (e) {
    console.warn('[calls] token fetch failed, joining without a token:', e?.message);
    return null;
  }
}
