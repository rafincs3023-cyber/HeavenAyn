// agoraConfig.js
// ---------------------------------------------------------------------------
// Production:
//   - Keep the Agora project in Secure / App ID + Token mode.
//   - Set AGORA_USE_TOKEN = true and use a backend token service.
//
// Temporary console-token testing:
//   - Set AGORA_TEMP_TEST = true.
//   - Generate a temporary RTC token in Agora Console for AGORA_TEST_CHANNEL.
//   - Put that token in EXPO_PUBLIC_AGORA_TEMP_TOKEN only on the local machine.
//   - Never put the App Certificate in the app.
// ---------------------------------------------------------------------------

export const AGORA_APP_ID = '2fc3c52470714429a3fe6200e8ef966c';

// Secure production-token path (Firebase Cloud Function / other token server).
export const AGORA_USE_TOKEN = false;

// Temporary development test using Agora Console token.
export const AGORA_TEMP_TEST = true;
export const AGORA_TEST_CHANNEL = 'heavenayn-test';
export const AGORA_TEMP_TOKEN = process.env.EXPO_PUBLIC_AGORA_TEMP_TOKEN || '';

// Ringing timeout — caller gives up (call marked "missed") after this many ms.
export const CALL_RING_TIMEOUT_MS = 35000;

// Agora needs a numeric uid (uint32, non-zero) in normal production mode.
export function hashUid(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 1_000_000_000) + 1;
}
