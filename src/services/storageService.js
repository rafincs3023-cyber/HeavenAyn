import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import uuid from 'react-native-uuid';

async function uriToBlob(uri) {
  const response = await fetch(uri);
  return await response.blob();
}

export async function uploadProfileImage(uid, localUri) {
  const blob = await uriToBlob(localUri);
  const fileRef = ref(storage, `profileImages/${uid}.jpg`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

export async function uploadChatImage(chatId, localUri) {
  const blob = await uriToBlob(localUri);
  const filename = `${uuid.v4()}.jpg`;
  const fileRef = ref(storage, `chatImages/${chatId}/${filename}`);
  await uploadBytes(fileRef, blob);
  return await getDownloadURL(fileRef);
}

// Generic file/document upload (pdf, docs, zip, etc.)
export async function uploadChatFile(chatId, localUri, originalName) {
  const blob = await uriToBlob(localUri);
  const safeName = originalName || `${uuid.v4()}`;
  const storedName = `${uuid.v4()}_${safeName}`;
  const fileRef = ref(storage, `chatFiles/${chatId}/${storedName}`);
  await uploadBytes(fileRef, blob);
  const url = await getDownloadURL(fileRef);
  return { url, name: safeName, size: blob.size || 0 };
}
