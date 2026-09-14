// notificationService.js
// ---------------------------------------------------------------------------
// Client-side push notification registration for HeavenAyn.
//
// This module ONLY registers the device and stores its Expo push token in
// Firestore. It never sends notifications from the client — actually
// delivering messages/call alerts must happen from a trusted server (a
// Cloud Function using the Firebase Admin SDK) that reads these tokens and
// calls Expo's push API. Keeping that split is what keeps push notifications
// from being spoofable by any signed-in client.
//
// Firestore layout:
//   users/{uid}/pushTokens/{deviceId}
//     token:      current Expo push token for this device
//     platform:   'ios' | 'android' | 'web'
//     deviceName: human-readable device name (best effort)
//     createdAt / updatedAt: server timestamps
//
// `deviceId` is a random id generated once per app install and persisted in
// AsyncStorage (NOT the push token itself). That keeps one Firestore doc per
// physical device for as long as the app is installed, so a later token
// refresh updates the same doc instead of leaving a stale one behind, and
// naturally supports multiple devices per account. Logout removes only the
// current device's doc, leaving other signed-in devices untouched.
// ---------------------------------------------------------------------------
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const DEVICE_ID_KEY = 'heavenayn:pushDeviceId';

// Foreground behavior: still show/sound the notification while the app is
// open, but never bump the app icon badge from here (badge counts are a
// product decision for later, driven by unread state, not by every push).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let cachedDeviceId = null;

async function getDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch (e) {
    // Storage unavailable: fall back to a session-only id rather than crash.
    // The token will just be re-saved as a "new device" next launch.
    return `${Platform.OS}-${Date.now()}`;
  }
}

// Android requires a notification channel before a notification can be
// shown. Two channels now so the eventual "incoming call" push (max
// importance, bypasses Do Not Disturb) never gets bucketed with normal
// message notifications.
async function ensureAndroidChannelsAsync() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Incoming Calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    sound: 'default',
    bypassDnd: true,
  });
}

// Resolves to an Expo push token string, or null if the device/permissions
// don't allow one. Never throws.
async function getExpoPushTokenAsync() {
  if (!Device.isDevice) {
    // Simulators/emulators don't have APNs/FCM — pushing here would just fail.
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  await ensureAndroidChannelsAsync();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token || null;
}

function pushTokenDocRef(uid, deviceId) {
  return doc(db, 'users', uid, 'pushTokens', deviceId);
}

async function savePushTokenAsync(uid, token) {
  const deviceId = await getDeviceId();
  const ref = pushTokenDocRef(uid, deviceId);

  const existingSnap = await getDoc(ref).catch(() => null);
  const existingData = existingSnap?.exists() ? existingSnap.data() : null;

  if (existingData?.token === token) {
    // Nothing changed — skip the write.
    return;
  }

  await setDoc(
    ref,
    {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || null,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Call once a Firebase user is confirmed signed in. Requests permission,
// obtains the Expo push token, and stores/updates it in Firestore. Resolves
// to the token (or null) and never throws, so it's always safe to call
// without blocking or breaking login.
export async function registerForPushNotificationsAsync(uid) {
  if (!uid) return null;
  try {
    const token = await getExpoPushTokenAsync();
    if (!token) return null;
    await savePushTokenAsync(uid, token);
    return token;
  } catch (e) {
    console.warn('[notificationService] registration failed:', e?.message || e);
    return null;
  }
}

// Push tokens can rotate while the app is running (rare, but happens). This
// keeps this device's Firestore doc in sync when that occurs. Returns a
// subscription with .remove() — always safe to call even if the native
// listener can't be attached.
export function addPushTokenRefreshListener(uid) {
  try {
    return Notifications.addPushTokenListener(async () => {
      if (!uid) return;
      try {
        const token = await getExpoPushTokenAsync();
        if (token) await savePushTokenAsync(uid, token);
      } catch (e) {
        console.warn('[notificationService] token refresh failed:', e?.message || e);
      }
    });
  } catch (e) {
    return { remove: () => {} };
  }
}

// Call on logout, before signing out of Firebase. Removes only this
// device's token doc so other signed-in devices for the same account keep
// receiving notifications.
export async function removePushTokenForDevice(uid) {
  if (!uid) return;
  try {
    const deviceId = await getDeviceId();
    await deleteDoc(pushTokenDocRef(uid, deviceId));
  } catch (e) {
    console.warn('[notificationService] failed to remove push token:', e?.message || e);
  }
}
