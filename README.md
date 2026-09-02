# HeavenAyn — Real-Time Messenger (Expo SDK 52 + Firebase)

A production-ready, WhatsApp/Messenger-style chat app built with React Native (Expo) and Firebase.

---

## 1. Project Structure

```
HeavenAyn/
├── App.js                       # Entry point — wires providers + navigation
├── app.json                     # Expo config (name, icons, permissions)
├── babel.config.js
├── package.json
├── firebaseConfig.js             # Firebase init (Auth, Firestore, Storage)
├── firestore.rules               # Security rules for Firestore
├── firestore.indexes.json        # Required composite index
├── storage.rules                 # Security rules for Storage
├── assets/                       # App icons / splash (placeholders included)
└── src/
    ├── context/
    │   ├── AuthContext.js         # Sign up / in / out, forgot pw, session persistence, online status
    │   └── ThemeContext.js        # Light/dark theme provider
    ├── theme/
    │   └── theme.js                # Color tokens for light & dark themes
    ├── navigation/
    │   ├── RootNavigator.js        # Splash -> Auth or Main, based on auth state
    │   ├── AuthNavigator.js        # Login, Register, ForgotPassword stack
    │   └── MainNavigator.js        # Home, Users, Chat, Profile, EditProfile stack
    ├── screens/
    │   ├── SplashScreen.js
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── ForgotPasswordScreen.js
    │   ├── HomeScreen.js           # Recent conversations (chat list)
    │   ├── UsersScreen.js          # Browse/search all users, start new chat
    │   ├── ChatScreen.js           # Real-time 1:1 chat screen
    │   ├── ProfileScreen.js        # View own profile, dark-mode toggle, logout
    │   └── EditProfileScreen.js    # Edit username/bio/photo
    ├── components/
    │   ├── Avatar.js               # Circular avatar with online-status dot
    │   ├── ChatListItem.js         # Row in the Home chat list
    │   ├── UserListItem.js         # Row in the Users screen
    │   └── MessageBubble.js        # Chat bubble with ticks (sent/seen)
    ├── services/                   # All Firebase logic lives here (no Firebase
    │   │                            calls happen directly inside screens)
    │   ├── userService.js          # Profile CRUD, search, online status
    │   ├── chatService.js          # Create/find chat, chat list, typing flag
    │   ├── messageService.js       # Send/subscribe messages, mark-as-seen
    │   └── storageService.js       # Upload profile/chat images
    └── utils/
        └── dateUtils.js             # WhatsApp-style time/date formatting
```

**Why this structure?** Screens only call functions from `services/`, never Firebase
SDK functions directly. This keeps UI components clean, makes the Firebase logic
testable/reusable, and means swapping backends later only touches the `services`
folder.

---

## 2. Install & Run

### Prerequisites
- Node.js 18+
- VS Code
- Expo Go app (SDK 52 build) on your phone, or an emulator
- A free Firebase project

### Step 1 — Create the project locally
Copy this `HeavenAyn` folder into your workspace, open it in VS Code, then:

```bash
cd HeavenAyn
npm install
npx expo install --fix   # aligns every Expo-managed package to the exact SDK 52 version
```

### Step 2 — Firebase project setup
1. Go to https://console.firebase.google.com → **Add project**.
2. Inside the project, click the **Web** icon (`</>`) → register an app (no need
   for Firebase Hosting) → copy the `firebaseConfig` object it gives you.
3. Paste those values into `firebaseConfig.js` at the project root.
4. **Authentication** → Sign-in method → enable **Email/Password**.
5. **Firestore Database** → Create database → start in **production mode**
   (we provide our own rules) → choose a region.
6. **Storage** → Get started → production mode.
7. Deploy the security rules (requires Firebase CLI):

```bash
npm install -g firebase-tools
firebase login
firebase init            # select Firestore + Storage, point to existing project,
                          # keep the existing firestore.rules / storage.rules / firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

   Alternatively, paste the contents of `firestore.rules` / `storage.rules`
   directly into the Firebase Console → Firestore/Storage → **Rules** tab and
   publish — no CLI required.

   **Important:** The Home screen's real-time chat list query needs the
   composite index defined in `firestore.indexes.json` (`users` array-contains +
   `updatedAt` descending). If you skip the CLI deploy, Firestore will show a
   console error in your terminal/logs the first time you run the query, with a
   direct link to auto-create the index — just click it.

### Step 3 — Run the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** (SDK 52) on your phone, or press `a` / `i`
for an Android/iOS emulator.

---

## 3. Feature Walkthrough & How to Test

| Feature | Where | How to test |
|---|---|---|
| Sign up | RegisterScreen → `AuthContext.register` | Create 2 separate accounts (use two phones/emulators, or two Expo Go sessions) so you have someone to chat with |
| Login / persistence | LoginScreen, `onAuthStateChanged` in AuthContext | Log in, fully close the app, reopen — you should land on Home, not Login |
| Forgot password | ForgotPasswordScreen | Enter a registered email → check inbox for Firebase's reset email |
| Find users | UsersScreen | Log in as User A, go to the people icon, search User B by username/email |
| Start chat | UsersScreen → `getOrCreateChat` | Tap a user → should open (or create) a private chat instantly |
| Real-time messages | ChatScreen → `subscribeToMessages` | Send a message from User A's device; it should appear on User B's device within ~1s with no manual refresh |
| Typing indicator | ChatScreen → `setTyping` / chat doc `typing` map | Start typing on device A without sending — device B's header should show "typing..." |
| Online/last seen | AuthContext AppState listener + Avatar status dot | Background the app on device A — device B should see it go from "Online" to "last seen just now" |
| Message status ticks | MessageBubble | Single grey check = sent, double blue check = seen (updates once the recipient opens the chat) |
| Send image | ChatScreen → image icon → `uploadChatImage` | Pick a photo, confirm the preview bar, hit send — the image should appear in the thread on both devices |
| Unread badge | HomeScreen / ChatListItem | Send messages from A to B while B is not inside that chat — B's Home screen shows an unread count bubble; opening the chat clears it |
| Edit profile | EditProfileScreen | Change username/bio/photo, save, confirm it reflects instantly on your own Profile screen and to the other user (username, avatar) in real time |
| Dark mode | ProfileScreen switch | Toggle it — every screen (headers, bubbles, inputs) should restyle immediately |
| Logout | ProfileScreen | Logs out, sets `online:false`, returns to Login screen |

---

## 4. Data Model (Firestore)

```
users/{uid}
  id, username, usernameLower, email, photoURL, bio,
  online, lastSeen, createdAt

chats/{chatId}                # chatId = sorted "uidA_uidB"
  chatId, users: [uidA, uidB],
  lastMessage, lastMessageType, lastMessageSenderId,
  updatedAt, typing: { uid: bool }, unreadCount: { uid: number }

  chats/{chatId}/messages/{messageId}     # subcollection, per chat
    chatId, senderId, text, imageURL, type, status, seen, createdAt
```

**Note on `messages`:** the spec described `messages` as a flat top-level
collection. This implementation stores messages as a **subcollection** under
each chat document (`chats/{chatId}/messages`) instead. This is the
Firestore-recommended pattern for chat apps because it lets security rules and
queries scope naturally to "messages in a chat I'm part of," without scanning
a global collection or requiring extra composite indexes. Every message
document still carries a `chatId` field for compatibility if you ever need to
migrate to a flat collection.

---

## 5. Known Limitations / Next Steps

- **Push notifications (FCM):** Expo Go has restricted remote push notification
  support on newer SDKs. `expo-notifications` is included as a dependency and
  can be wired up for **local** notifications immediately; for full background
  **remote** push (e.g., new-message alerts while the app is killed) you'll
  need an Expo **Development Build** (`npx expo prebuild` + EAS Build) rather
  than Expo Go, plus a Firebase Cloud Function that triggers on new message
  documents to call the FCM Admin SDK.
- **Delivered status:** Currently the model tracks `sent` and `seen`. A true
  "delivered" (received on device, not yet opened) state would need a Cloud
  Function or presence system — straightforward to add on top of `messageService.js`.
- **Message pagination:** All messages in a chat currently load at once via
  `orderBy('createdAt')`. For very long histories, switch to `limit()` +
  `startAfter()` cursor pagination in `subscribeToMessages`.
- **Group chats:** The schema (`users: [uid1, uid2]`) is 1:1 only. Extending to
  groups means allowing more than 2 uids in `users` and adjusting the security
  rules/unread-count map accordingly.

---

## 6. Firebase Config Checklist

Make sure `firebaseConfig.js` has real (not placeholder) values:

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...firebaseapp.com',
  projectId: '...',
  storageBucket: '...appspot.com',
  messagingSenderId: '...',
  appId: '...',
};
```

If you see `auth/invalid-api-key` or the app hangs on the splash screen, this
is almost always the cause.
