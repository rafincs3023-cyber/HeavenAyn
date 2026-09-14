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
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { sendPushToUser } = require('./pushService');

if (!getApps().length) initializeApp();
const db = getFirestore();

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

// ---------------------------------------------------------------------------
// Push notifications — trusted backend only. The client never sends pushes
// itself; it only registers Expo push tokens (see notificationService.js).
// ---------------------------------------------------------------------------

const MESSAGE_PREVIEW_MAX_LENGTH = 120;

// Keeps the push payload minimal and avoids leaking private content: media
// messages get a generic label, text is trimmed to a short preview.
function buildMessageNotificationBody(message) {
  switch (message?.type) {
    case 'image':
      return 'Sent you a photo';
    case 'file':
      return 'Sent you a file';
    case 'text': {
      const text = (message.text || '').trim();
      if (!text) return 'New message';
      return text.length > MESSAGE_PREVIEW_MAX_LENGTH
        ? `${text.slice(0, MESSAGE_PREVIEW_MAX_LENGTH - 3)}...`
        : text;
    }
    default:
      return 'New message';
  }
}

// TASK A — new chat message -> push the recipient (never the sender).
exports.onNewMessage = onDocumentCreated('chats/{chatId}/messages/{messageId}', async (event) => {
  const message = event.data?.data();
  if (!message?.senderId) return;

  const { chatId, messageId } = event.params;

  try {
    const chatSnap = await db.doc(`chats/${chatId}`).get();
    const users = chatSnap.exists ? chatSnap.data().users : null;
    if (!Array.isArray(users)) return;

    const recipientId = users.find((uid) => uid !== message.senderId);
    if (!recipientId) return; // no second participant to notify

    const senderSnap = await db.doc(`users/${message.senderId}`).get();
    const senderName = senderSnap.exists ? senderSnap.data()?.username || 'Someone' : 'Someone';

    await sendPushToUser(db, recipientId, {
      title: senderName,
      body: buildMessageNotificationBody(message),
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: {
        type: 'message',
        chatId,
        senderId: message.senderId,
        messageId,
      },
    });
  } catch (e) {
    console.error(`[onNewMessage] failed for chat ${chatId}:`, e?.message || e);
  }
});

// TASK B — a call document is only ever created with status "ringing"
// (see callService.js createCall), so onCreate fires exactly once per call
// and needs no extra de-duplication.
exports.onIncomingCall = onDocumentCreated('calls/{callId}', async (event) => {
  const call = event.data?.data();
  if (!call || call.status !== 'ringing') return;
  if (!call.calleeId || !call.callerId) return;

  const { callId } = event.params;

  try {
    await sendPushToUser(db, call.calleeId, {
      title: call.callerName || 'Incoming call',
      body: call.type === 'video' ? 'Incoming video call' : 'Incoming voice call',
      sound: 'default',
      priority: 'high',
      channelId: 'calls',
      data: {
        type: 'call',
        callId: call.callId || callId,
        callerId: call.callerId,
        callType: call.type || 'audio',
      },
    });
  } catch (e) {
    console.error(`[onIncomingCall] failed for call ${callId}:`, e?.message || e);
  }
});
