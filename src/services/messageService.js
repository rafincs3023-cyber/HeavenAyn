import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { updateChatLastMessage } from './chatService';

function messagesRef(chatId) {
  return collection(db, 'chats', chatId, 'messages');
}

export async function sendTextMessage(chatId, { senderId, otherUid, text }) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(messagesRef(chatId), {
    chatId,
    senderId,
    text: trimmed,
    imageURL: null,
    type: 'text',
    status: 'sent',
    seen: false,
    createdAt: serverTimestamp(),
  });

  await updateChatLastMessage(chatId, { text: trimmed, senderId, type: 'text', otherUid });
}

export async function sendImageMessage(chatId, { senderId, otherUid, imageURL }) {
  await addDoc(messagesRef(chatId), {
    chatId,
    senderId,
    text: '',
    imageURL,
    type: 'image',
    status: 'sent',
    seen: false,
    createdAt: serverTimestamp(),
  });

  await updateChatLastMessage(chatId, { text: '', senderId, type: 'image', otherUid });
}

export async function sendFileMessage(chatId, { senderId, otherUid, fileURL, fileName, fileSize }) {
  await addDoc(messagesRef(chatId), {
    chatId,
    senderId,
    text: '',
    imageURL: null,
    fileURL,
    fileName: fileName || 'File',
    fileSize: fileSize || 0,
    type: 'file',
    status: 'sent',
    seen: false,
    createdAt: serverTimestamp(),
  });

  await updateChatLastMessage(chatId, { text: '', senderId, type: 'file', otherUid });
}

// Real-time listener for all messages in a chat, oldest first
export function subscribeToMessages(chatId, callback) {
  const q = query(messagesRef(chatId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

// Mark all messages not sent by me as seen (batched write)
export async function markMessagesAsSeen(chatId, currentUid) {
  const q = query(
    messagesRef(chatId),
    where('senderId', '!=', currentUid)
  );
  const snapshot = await getDocs(q);
  const unseen = snapshot.docs.filter((d) => d.data().seen === false);
  if (unseen.length === 0) return;

  const batch = writeBatch(db);
  unseen.forEach((docSnap) => {
    batch.update(docSnap.ref, { seen: true, status: 'seen' });
  });
  await batch.commit();
}
