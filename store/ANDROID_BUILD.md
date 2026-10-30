# Building the Android app (on your Mac)

This repo can't produce the signed `.aab` itself — Android's SDK/build
tooling needs to run locally. This is the runbook to do it on your Mac.
Everything here uses **Bubblewrap**, Google's own official CLI for wrapping
a PWA as a Trusted Web Activity (TWA) — a thin native Android app that
launches this site full-screen, with no browser UI once verified.

## 1. Prerequisites

```bash
# Node.js (if you don't already have it) — via Homebrew:
brew install node

# Java 17 (Bubblewrap needs a JDK; Temurin is a good free distribution)
brew install --cask temurin17

# Bubblewrap CLI
npm install -g @bubblewrap/cli
```

You do **not** need to separately install Android Studio first —
Bubblewrap will offer to download the Android SDK command-line tools and
build tools itself the first time you run `init`, if it can't find them.

## 2. Initialize the project

```bash
bubblewrap init --manifest=https://grimdoro.com/manifest.webmanifest
```

It reads the live web manifest and asks a series of questions. Recommended
answers (press Enter to accept a sensible default where one is offered):

| Prompt | Answer |
|---|---|
| Domain | `grimdoro.com` (auto-filled) |
| Application ID | `com.grimdoro.app` — **this is effectively permanent once you publish; change it now if you'd rather use something else** |
| Application name | `Pomodoro of the Damned` |
| Short/launcher name | `Pomodoro` |
| Display mode | `standalone` |
| Orientation | `portrait` |
| Theme / status bar color | `#0a0605` |
| Background color | `#0a0605` |
| Icon URL | pick the 512×512 icon (auto-detected from the manifest) |
| Maskable icon | yes, use the one offered (auto-detected) |
| Monochrome icon (Android 13+ themed icon) | optional — fine to skip for v1 |
| Include app shortcuts | no |
| Signing key | **generate a new one** — see the critical note below |

### Critical: back up the signing key immediately

Bubblewrap will create `android.keystore` in the project folder and ask
for a keystore password and a key password. **The moment this file exists:**

1. Copy `android.keystore` to at least two safe places (a password
   manager that supports file attachments, and/or an encrypted backup).
   **Never commit it to the GitHub repo** — it's a credential, not code.
2. Save the keystore password and key alias/password in your password
   manager right next to it.
3. If this file is ever lost, you permanently lose the ability to publish
   updates to this app listing under the same identity — there's no
   recovery, only a lengthy Google appeals process at best.

## 3. Build

```bash
bubblewrap build
```

This produces `app-release-bundle.aab` (what you upload to Play Console)
and a `.apk` you can sideload for testing.

To test on a connected device or emulator:

```bash
bubblewrap install
```

## 4. Google Play Console

1. Create a Play Console account if you haven't: https://play.google.com/console (one-time $25 registration fee).
2. Create a new app. Use `store/LISTING.md` in this repo for all the copy
   (name, descriptions, category, support email, privacy policy URL).
3. Upload the graphics from `store/`: `feature-graphic-1024x500.png`,
   `screenshot-1-home.png`, `screenshot-2-running.png`, and the app icon
   at `icons/icon-512.png`.
4. Fill out the Content rating questionnaire and Data safety form — see
   the expected answers in `store/LISTING.md`.
5. Create a release — **Internal testing** track first is strongly
   recommended before Production, so you can install it on your own
   phone and check it actually works before anyone else sees it.
6. Upload `app-release-bundle.aab`. Accept **Play App Signing** when
   offered (Google's recommended default) — this re-signs the app with
   its own key for distribution while your upload key just authenticates
   you. Keep both safe regardless.

## 5. Finish the TWA verification (send this back to me)

Once the first upload succeeds:

1. In Play Console, go to **Setup → App integrity** (sometimes labeled
   "App signing").
2. Copy the **SHA-256 certificate fingerprint** shown there.
3. Send it to me.

I'll write `.well-known/assetlinks.json` with that fingerprint and push it
to `grimdoro.com` — that's what makes Android trust the app enough to drop
the browser address bar and show it as a fully native-feeling app.

## 6. A note on review

Unlike Apple, Google Play is comfortable with well-built TWAs — this is an
officially sanctioned, documented path, not a gray area. Review is
typically faster and less strict than the App Store's. First Production
review is usually a few hours to a couple of days.
