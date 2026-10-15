# HeavenAyn — notes for Claude Code

WhatsApp/Messenger-style real-time chat app with 1:1 audio/video calls.
Owner: Rafi (CSE student, Windows PC). Explain *what* you are doing and *why*,
and always pick the safest way. Reply in Bengali if Rafi writes in Bengali.

## Stack
- React Native 0.76 via **Expo SDK 52** (JavaScript, not TypeScript)
- Firebase v10: Auth, Firestore, Storage, Cloud Functions (Node 20, in `functions/`)
- React Navigation v6
- Calls: **Agora** (`react-native-agora`) — needs an Expo **development build**, not Expo Go
- Push: Expo push tokens, sent only from Cloud Functions
- Firebase project: `chat-app-e7898` (see `.firebaserc`). Android package: `com.heavenayn.app`

## Architecture rules (do not break)
1. **Screens never call the Firebase SDK directly.** All Firebase logic lives in
   `src/services/` (`chatService`, `messageService`, `userService`,
   `storageService`, `callService`, `notificationService`). Screens import those.
2. Agora native code is loaded only through `src/services/agoraService.js`
   (`agoraService.web.js` is the web stub). Check `isCallingSupported` first.
3. Pushes are sent only by the backend (`functions/`), never by the client.
4. Use `showAlert` from `src/utils/alert.js` instead of `Alert.alert` (works on web too).

## Calls and Agora tokens
- Call lifecycle lives in Firestore `calls/{callId}`:
  `ringing -> accepted -> ended`, or `declined` / `cancelled` / `missed`.
- The Agora channel name is the call id.
- Tokens come from the Cloud Function `getAgoraToken` (`functions/index.js`). It only
  gives a token to the caller or callee of a live call, and only for their own uid.
  Tokens last 1 hour; `CallScreen` renews them with `onTokenPrivilegeWillExpire`.
- `hashUid()` exists in BOTH `src/config/agoraConfig.js` and `functions/index.js`.
  **They must stay identical**, or every token will be rejected.
- Committed config must stay `AGORA_USE_TOKEN = true` and `AGORA_TEMP_TEST = false`.
  Temp test mode puts every call in one shared channel and its token expires.
- If a token cannot be fetched, end the call. **Never join a channel without a token.**

## Secrets — strict rules
- The **Agora App Certificate** must never appear in code, chat, logs, commits or
  `.env` files. It lives only in Firebase Secret Manager as `AGORA_APP_CERTIFICATE`.
- Never read, print or `cat` `.env` files or secret values.
- `firebase functions:secrets:set ...` is interactive and asks for the secret value.
  **Do not run it yourself.** Ask Rafi to run it with the `!` prefix so he types the value.
- Never turn the Agora project to "App ID only" (no token) mode: the App ID is public.

## Git workflow
- Active branch: **`heavenayn-updates`** (PR #1). `main` is still the initial commit.
- Never force-push, never commit to `main` directly. Show the diff before committing.

## Common commands (Windows, run from repo root)
```
npm install                          # app dependencies
npx expo start                       # start Metro for the dev build
cd functions && npm install && cd .. # Cloud Functions dependencies
firebase deploy --only functions     # deploy backend (needs Blaze plan)
firebase deploy --only firestore:rules,storage
firebase functions:log               # backend logs when a call fails
```

## Order when switching to server tokens
Deploy the functions (with both secrets set) **before** running the new app code.
Otherwise every call fails because the token server does not exist yet.
Use the `/agora-token-setup` command to walk through it.

## Known gaps (roadmap)
Delivered tick, video message type, message pagination, call history screen,
call reconnect / network quality, lock-screen full-screen incoming call,
group chat and group calls, testing, release APK/AAB.
