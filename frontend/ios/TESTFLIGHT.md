# Lingwave internal TestFlight release

The iPhone app bundles the same React routes as the website. Rebuilding it from the released source updates Home, Today, Library, Media and Script Lab together. Script Lab audio ships inside the app. Larger guided and curriculum media load from Lingwave.

## Set up the release on the Mac

1. Open the app repository `lokigod69/resonance-cloud`. Read `AGENTS.md`, check for local changes, then fast-forward `main` from `origin`. Preserve local work. Record the commit you will archive and confirm it contains this handoff and the pronunciation pack (`8804945f`).
2. Use Xcode 26 or later with an iOS 26 or later SDK and an Apple account for team `ZL69STWQHV`. Reuse **Lingwave: Language Practice**, Apple ID `6831753115`, bundle ID `ai.lingwave.app`. Version 1.0 builds 1–4 were uploaded on November 7, 2026; repaired build 4 (`323ca7bf`) is Testing in the Lingwave Owner internal group. It includes the signed-in layout fixes and Text save/pronunciation repair. Read the current TestFlight build history before selecting the next number. [Apple SDK requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
3. For the first build, register the explicit App ID `ai.lingwave.app` with Associated Domains. In App Store Connect → Apps, create the iOS app **Lingwave**, primary language **English (U.S.)**, with the same identifier and a unique SKU such as `lingwave-ios`. Reuse any matching record already there. If Apple's name availability, agreements, or account permissions require an owner decision, report the exact prompt. [Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id/) · [Create the app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)
4. From `frontend/`, use Node 22.12 or newer in the Node 22 LTS line and run `npm ci`. Vite needs the production **public client** settings on this machine. Use the existing configured environment, or populate ignored `.env.ios.local` with `VITE_SUPABASE_URL=https://rkiucrrusrwgcviodysp.supabase.co` and `VITE_SUPABASE_ANON_KEY` from that project's publishable or legacy anon key. Get that value from the signed-in Supabase project or an existing local client configuration. Keep credentials out of logs, chat and git.

## Build, check and upload

From `frontend/` on the Mac:

```sh
npm run verify && npm run test:local && npm run build:ios
```

`build:ios` checks the signed-in shell fixtures and alphabet inventory, builds the app, strips the remotely served media, syncs Capacitor, and compares the native copy with the fresh build. The production origins and native sign-in callback come from `.env.ios`. The offline UI gate uses Chrome or Brave (or `CHROME_PATH`) and real Home/Generate components inside PolishGlassLayout, with fake auth and providers. It covers phone safe areas, 320px/393px German forms, Standard selection, Text generation, pending editing locks, failed-request recovery, Text editing and Home recording validity/replay. Run it separately with `npm run test:ios-ui`.

Text cards use device pronunciation when no recording exists. Editing the headword clears its obsolete recording; translation-only changes retain it. The legacy generated-pronunciation endpoint was never deployed, so successful Text saves must not wait for it or claim a recording was regenerated. Physical playback still needs a device check.

Before calling a release verified, inspect the signed-in Home and Media screens in an iPhone web view. Enter and lock two words, open and dismiss the software keyboard, then scroll. Check header clearance, no horizontal clipping or focus zoom, and all six bottom tabs. Also inspect the signed-out landing screen. Keep audio muted. Physical camera/audio checks must be reported separately from simulator evidence.

Provider readiness is a separate release gate. On November 7, the actual iPhone requests failed because OpenRouter returned 401 (Text and Standard cards), while direct Gemini returned 402 (Lens); Supabase and Railway were running. A 200 health endpoint, successful build or mocked generation does not prove these services work. Check recent production request/worker logs. After credentials/billing are restored, run one bounded live Text, Standard and Lens check only with an approved test budget. Report blocked/unverified services explicitly; never label offline mocks as end-to-end provider success.

Confirm the marketing version and select a build number above the latest upload for that version, including builds still processing. For a first upload the project defaults are version `1.0`, build `1`. Keep the existing automatic signing team and bundle ID. Use a fresh archive path and verify the actual archived resources before uploading:

```sh
# Set BUILD_NUMBER to the number confirmed in App Store Connect.
: "${BUILD_NUMBER:?Set the checked TestFlight build number}"
ARCHIVE="$HOME/Library/Developer/Xcode/Archives/$(date +%F)/Lingwave-$(date +%H%M%S).xcarchive"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION="$BUILD_NUMBER" archive &&
npm run verify:ios-bundle -- "$ARCHIVE/Products/Applications/App.app/public" &&
open "$ARCHIVE"
```

In Xcode Organizer, select that verified archive and choose **Distribute App → TestFlight Internal Only**. Check the app ID, version and build in the upload summary. After upload, wait for Apple's processing in App Store Connect. Assign the processed build to an internal group containing the owner, or verify its automatic assignment. If the group is missing, create an owner-only internal group. Report the version, actual build number, source commit, processing status and group availability when the owner can tap **Install** in TestFlight. [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/) · [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

**What to Test** — In Home or Today, select Japanese, open Hiragana, choose あ and tap the speaker beside あさ. Switch to Russian, open Cyrillic, choose А and tap the speaker beside август. In Korean, open Hangul → Build and make 간 (ㄱ + ㅏ + ㄴ). At a comfortable volume, replay each clip. Also try switching learning languages and resuming a guided lesson.
