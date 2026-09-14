// pushService.js
// ---------------------------------------------------------------------------
// Trusted-backend Expo push delivery, shared by the message and call
// Cloud Functions. Runs only with the Admin SDK inside Cloud Functions —
// never call this from client code.
//
// Firestore layout read here: users/{uid}/pushTokens/{deviceId} (written by
// the client's notificationService.js), one doc per device.
// ---------------------------------------------------------------------------

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100; // Expo's documented max messages per request

function isExpoPushToken(token) {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function getDeviceTokensForUser(db, uid) {
  if (!uid) return [];
  const snap = await db.collection('users').doc(uid).collection('pushTokens').get();
  const devices = [];
  snap.forEach((docSnap) => {
    const token = docSnap.data()?.token;
    if (isExpoPushToken(token)) {
      devices.push({ deviceId: docSnap.id, token });
    }
    // Malformed/missing tokens are silently skipped rather than sent.
  });
  return devices;
}

// Sends `payload` (title/body/data/etc — everything except `to`) to every
// registered device for `uid`. Devices Expo reports as no longer registered
// are removed from Firestore; other devices and other errors are left alone
// so one bad token never blocks the rest of the batch.
async function sendPushToUser(db, uid, payload) {
  if (!uid) return;
  const devices = await getDeviceTokensForUser(db, uid);
  if (devices.length === 0) return;

  const batches = chunk(devices, EXPO_PUSH_CHUNK_SIZE);

  for (const batch of batches) {
    const body = batch.map((device) => ({ to: device.token, ...payload }));

    let tickets;
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      tickets = json?.data;
    } catch (e) {
      // Network failure: log and move on to the next batch rather than
      // aborting the whole send.
      console.error(`[pushService] Expo request failed for user ${uid}:`, e?.message || e);
      continue;
    }

    if (!Array.isArray(tickets)) {
      console.error(`[pushService] unexpected Expo push response for user ${uid}`, json);
      continue;
    }

    await Promise.all(
      tickets.map(async (ticket, i) => {
        const device = batch[i];
        if (ticket?.status !== 'error') return;

        console.warn(`[pushService] push error for device ${device.deviceId}:`, ticket.message);

        if (ticket.details?.error === 'DeviceNotRegistered') {
          await db
            .collection('users')
            .doc(uid)
            .collection('pushTokens')
            .doc(device.deviceId)
            .delete()
            .catch((e) => {
              console.error(`[pushService] failed to remove stale token ${device.deviceId}:`, e?.message || e);
            });
        }
        // Other error kinds (MessageTooBig, MessageRateExceeded, ...) are
        // logged only — they don't mean the token itself is bad.
      })
    );
  }
}

module.exports = { isExpoPushToken, getDeviceTokensForUser, sendPushToUser };
