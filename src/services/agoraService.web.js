import { Platform } from 'react-native';

export const isCallingSupported = false;
export const callingUnavailableReason =
  'Voice and video calls are not available on the web version.';

export function getAgora() {
  return null;
}

export async function requestCallPermissions() {
  return Platform.OS === 'web';
}