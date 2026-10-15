---
name: agora-token-setup
description: Step-by-step setup of the Agora token server (Firebase secrets, deploy, then app reload) so calls stop failing after the temporary token expires.
disable-model-invocation: true
---

Guide Rafi through switching HeavenAyn calls to server-issued Agora tokens.
Go one step at a time, explain in one or two lines why each step matters, and
wait for him to confirm before moving on. Reply in Bengali if he writes in Bengali.

**Never ask for, read, print or store the App Certificate.** Rafi types secret
values himself.

1. **Check the branch.** Run `git status` and `git branch --show-current`.
   It must be `heavenayn-updates` with no uncommitted changes. If not, stop and ask.

2. **Check Firebase CLI.** Run `firebase --version` and `firebase use`.
   The active project must be `chat-app-e7898`. If the CLI is missing, tell Rafi to
   run `npm install -g firebase-tools` and `! firebase login` himself (it opens a browser).

3. **Get the certificate.** Tell Rafi: Agora Console → Projects → HeavenAyn →
   Configure → copy the **Primary Certificate**. He must not paste it into the chat.

4. **Set the secrets.** These prompts ask for the value, so Rafi runs them himself
   with the `!` prefix:
   - `! firebase functions:secrets:set AGORA_APP_ID`
   - `! firebase functions:secrets:set AGORA_APP_CERTIFICATE`
   Afterwards you may verify with `firebase functions:secrets:access AGORA_APP_ID`
   **only for the App ID** — never access the certificate.

5. **Install and deploy the backend.**
   `cd functions && npm install && cd ..` then `firebase deploy --only functions`.
   If it asks for the Blaze plan, stop: Rafi must enable billing himself in the
   Firebase Console, then re-run the deploy. Success = "Deploy complete!".

6. **Confirm the app config.** `src/config/agoraConfig.js` must have
   `AGORA_USE_TOKEN = true` and `AGORA_TEMP_TEST = false`. Then `npx expo start`
   and reload the development build on the phone.

7. **Test.** Two Android phones, two different accounts: one audio call and one video
   call. If a call shows "Call failed", run `firebase functions:log` and read the
   `getAgoraToken` errors (permission-denied, not-found, failed-precondition) to explain the cause.
