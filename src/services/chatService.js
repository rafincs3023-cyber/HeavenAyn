import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  increment,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const chatsRef = collection(db, 'chats');

// Deterministic chat id so two users always land on the same chat document
export function getChatId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export async function getOrCreateChat(uidA, uidB) {
  const chatId = getChatId(uidA, uidB);
  const chatDocRef = doc(db, 'chats', chatId);
  const snap = await getDoc(chatDocRef);

  if (!snap.exists()) {
    await setDoc(chatDocRef, {
      chatId,
      users: [uidA, uidB],
      lastMessage: '',
      lastMessageType: 'text',
      lastMessageSenderId: '',
      updatedAt: serverTimestamp(),
      typing: {},
      unreadCount: {
        [uidA]: 0,
        [uidB]: 0,
      },
    });
  }
  return chatId;
}

// Real-time list of the current user's conversations, newest first
export function subscribeToUserChats(uid, callback) {
  const q = query(
    chatsRef,
    where('users', 'array-contains', uid),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(chats);
  });
}

export function subscribeToChat(chatId, callback) {
  return onSnapshot(doc(db, 'chats', chatId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function setTyping(chatId, uid, isTyping) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`typing.${uid}`]: isTyping,
  });
}

export async function resetUnreadCount(chatId, uid) {
  await updateDoc(doc(db, 'chats', chatId), {
    [`unreadCount.${uid}`]: 0,
  });
}

export async function updateChatLastMessage(chatId, { text, senderId, type = 'text', otherUid }) {
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: type === 'image' ? '📷 Photo' : type === 'file' ? '📎 File' : text,
    lastMessageType: type,
    lastMessageSenderId: senderId,
    updatedAt: serverTimestamp(),
    [`unreadCount.${otherUid}`]: increment(1),
  });
}
