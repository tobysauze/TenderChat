# Shipping Tender to the iOS App Store (Capacitor)

The repo is now a Capacitor project that wraps the Next.js static export
(`out/`) in a native iOS app. The web code is unchanged — Capacitor just
loads the built site inside a native shell.

## What's already done (in the repo)

- Capacitor installed + configured (`capacitor.config.ts`, appId `ink.tender.app`)
- iOS native project scaffolded in `ios/`
- App icon + splash generated from the Tender logo
- `InstallPrompt` suppressed when running as a native app

## One-time machine setup (you)

1. **Install Xcode** from the Mac App Store (~7 GB). You currently only have
   the Command Line Tools.
2. After it installs, point the toolchain at it:
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. Open Xcode once and accept the license + let it install components.
4. **Apple Developer Program** — enrol at developer.apple.com ($99/year).
   Required to put anything on the App Store.

## The everyday workflow

Whenever you change the web app and want it in the iOS build:

```sh
npm run cap:sync     # builds the web app + copies it into ios/
npm run cap:open     # opens the project in Xcode
```

Then in Xcode: press the ▶︎ Run button to launch in the simulator, or
select your iPhone (plugged in) to run on device.

## First-run config in Xcode

1. In Xcode, select the **App** target → **Signing & Capabilities**.
2. Set **Team** to your Apple Developer account (add it via Xcode →
   Settings → Accounts if it's not listed).
3. The **Bundle Identifier** should read `ink.tender.app`. If Xcode says
   it's taken, change it (e.g. `ink.tender.yachtapp`) here *and* in
   `capacitor.config.ts`, then re-run `npm run cap:sync`.
4. Set a **Display Name** of "Tender" if it isn't already.

## Submitting to the App Store

1. In Xcode: **Product → Archive** (select "Any iOS Device" as the target
   first; you can't archive against the simulator).
2. When the Organizer window opens, click **Distribute App → App Store Connect**.
3. Create the app listing at appstoreconnect.apple.com:
   - Name, subtitle, description, keywords
   - Screenshots (6.7" and 6.5" iPhone sizes at minimum — take them in the
     simulator with ⌘S)
   - Privacy policy URL: `https://tender.ink/legal/privacy/`
   - Support URL: `https://tender.ink`
   - Age rating: will be 17+ given the dating category
4. Submit for review.

## Dating-app review checklist (Apple is stricter here)

Apple reviews dating apps under Guideline 1.2 and 5. You already have most
of what they look for — make sure each is reachable for the reviewer:

- ✅ Block another user (chat menu → Block)
- ✅ Report another user (chat menu → Report)
- ✅ 18+ confirmation at signup
- ✅ Account deletion (cog menu → Delete account)
- ✅ Privacy policy + Terms linked in-app
- ⚠️ Add a EULA line about **zero tolerance for objectionable content and
  abusive users** (Apple specifically requires this wording for UGC apps).
  The Terms cover acceptable use; consider adding an explicit
  "we remove objectionable content and ejecting abusive users within 24h
  of a report" sentence.
- In the App Review notes, give the reviewer a **test account** (email +
  password) so they can get past the login.

## Known follow-ups (not blockers for a first build)

- **Push notifications**: the current web-push setup does NOT work inside
  the native web view. For native push you'd add `@capacitor/push-notifications`
  + APNs (or route everything through OneSignal, which does web + native
  from one place). The Notifications toggle simply won't appear in the
  native app until this is done.
- **Auth deep links**: email confirmation / password-reset links open in
  Safari at tender.ink, not in the app. Works (confirm in Safari, then sign
  in on the app), but a universal-link setup would make it seamless.
