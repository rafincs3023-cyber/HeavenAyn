import { Platform, PermissionsAndroid } from 'react-native';

// react-native-agora is a native module: it is unavailable in Expo Go and on
// web. Load it lazily so importing this file never crashes those targets —
// callers check `isCallingSupported` first.
let agora = null;
let loadError = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // eslint-disable-next-line global-require
    agora = require('react-native-agora');
  } catch (e) {
    loadError = e;
  }
}

export const isCallingSupported = !!agora;
export const callingUnavailableReason = !agora
  ? Platform.OS === 'web'
    ? 'Voice and video calls are not available on the web version.'
    : 'Calling needs a development build. Run "npx expo prebuild" and rebuild the app (Expo Go can\'t load the Agora module).'
  : null;

export function getAgora() {
  return agora;
}

// Android needs the mic (and camera for video) granted at runtime before the
// Agora engine can publish tracks.
export async function requestCallPermissions(isVideo) {
  if (Platform.OS !== 'android') return true;
  const needed = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (isVideo) needed.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  try {
    const result = await PermissionsAndroid.requestMultiple(needed);
    return needed.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) {
    return false;
  }
}

if (loadError) {
  console.warn('[calls] react-native-agora failed to load:', loadError?.message);
}
