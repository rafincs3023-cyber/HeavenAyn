// agoraConfig.js
// ---------------------------------------------------------------------------
// 1. Go to https://console.agora.io -> create a project
// 2. Copy the App ID and paste it below
// 3. Auth mode:
//      - "Testing / APP ID"  -> leave AGORA_USE_TOKEN = false (quick start, dev only)
//      - "APP ID + Token"    -> set AGORA_USE_TOKEN = true and deploy the
//                               `getAgoraToken` Cloud Function (see functions/)
// ---------------------------------------------------------------------------

export const AGORA_APP_ID = 'PASTE_YOUR_AGORA_APP_ID_HERE';

// When true, CallScreen asks the `getAgoraToken` Cloud Function for a fresh
// RTC token before joining. When false, it joins with an empty token (only
// works while the Agora project is in testing mode).
export const AGORA_USE_TOKEN = false;

// Ringing timeout — caller gives up (call marked "missed") after this many ms.
export const CALL_RING_TIMEOUT_MS = 35000;

// Agora needs a numeric uid (uint32, non-zero). Firebase uids are strings, so
// hash each one into a stable number. Same input always maps to the same uid.
export function hashUid(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1_000_000_000) + 1;
}
