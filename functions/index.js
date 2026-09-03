// Cloud Functions for HeavenAyn
// ---------------------------------------------------------------------------
// getAgoraToken — mints a short-lived Agora RTC token so clients never hold
// the App Certificate. Only needed when the Agora project is in
// "APP ID + Token" auth mode (set AGORA_USE_TOKEN = true in
// src/config/agoraConfig.js).
//
// Configure credentials once, then deploy:
//   firebase functions:secrets:set AGORA_APP_ID
//   firebase functions:secrets:set AGORA_APP_CERTIFICATE
//   firebase deploy --only functions
// ---------------------------------------------------------------------------
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const TOKEN_TTL_SECONDS = 3600;

exports.getAgoraToken = onCall(
  { secrets: ['AGORA_APP_ID', 'AGORA_APP_CERTIFICATE'] },
  (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to start a call.');
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      throw new HttpsError('failed-precondition', 'Agora credentials are not configured.');
    }

    const { channelName, uid } = request.data || {};
    if (typeof channelName !== 'string' || !channelName) {
      throw new HttpsError('invalid-argument', 'channelName is required.');
    }
    if (typeof uid !== 'number' || !Number.isFinite(uid)) {
      throw new HttpsError('invalid-argument', 'A numeric uid is required.');
    }

    // agora-token v2 takes expirations as durations in seconds from now.
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS
    );

    return { token, expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  }
);
