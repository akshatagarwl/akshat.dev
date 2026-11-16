---
title: "making an android tv less annoying"
description: "Remote buttons, Google voice search, reversible channel filters and consent-first phone installers."
topic: "Android TV"
---

I wanted a fairly ordinary thing from a Sony Android TV: hold the volume button to change the volume, press the remote's microphone button to search YouTube, and choose which channels show up. Getting those three things to coexist took more work than installing a replacement YouTube app.

These are notes from a Sony BRAVIA KD-55X75K running Android 11, with 2 GB of RAM and a 32-bit ARM app environment. They are not a universal debloating recipe. I kept the system image, Google recognition and existing account data, and made the changes reversible.

## The volume problem was my key filter

An earlier accessibility service intercepted remote keys. Holding a volume button no longer repeated normally. Disabling that service restored held-volume repeat, which was confirmed on the actual remote.

The replacement integration deliberately cannot request key-event filtering. It has no remote-button remapping and no `onKeyEvent` handler. I wanted to fix search, not become responsible for every button the TV receives.

## Keep Google recognition, replace the broken handoff

I used [TizenTube Cobalt](https://github.com/reisxd/TizenTubeCobalt) as the player. Direct playback worked, but clicking a video card in Google's TV search failed to launch it. The logs showed that Google could not start the result's activity intent. Making Cobalt a YouTube-link handler did not repair those package-targeted cards.

A replacement-package bridge also hit `INSTALL_FAILED_VERSION_DOWNGRADE`. The factory YouTube package was still in the read-only system image even though it was removed for the current user. I did not try to bypass signatures, delete system files or root the TV. Experiments with alternative voice assistants were reverted; Google remained the recognizer.

Instead, I built a small [search-handoff app](https://github.com/akshatagarwl/tv-search-handoff) . After Google displays a completed query, the helper reads its search header and opens a Cobalt search URL. You then select a result inside Cobalt. It does not repair Google's cards or pretend to play the exact video from one of them.

- The header ID is `com.google.android.katniss:id/super_header`. A Google UI update can break this integration.
- On this Sony, `getRootInActiveWindow()` sometimes returns nothing while the header is visible. Retrieving interactive windows with `getWindows()` fixed that case.
- Retries are bounded, and duplicate suppression stops Back or a window-change event from immediately reopening the same search. There is no always-on polling.
- The helper has no Internet or microphone permission and does not persist or log queries. Accessibility access is still sensitive and must be enabled explicitly.

This is not offline voice search: Google processes the speech and YouTube receives the search through the player. It also redirects non-video queries if Google displays them on that same results screen. That is a real limitation, not a general Assistant replacement.

## A home tile, not another background service

A separate [launcher shortcut](https://github.com/akshatagarwl/tv-youtube-shortcut) opens the preferred player, falling back to official Cobalt when necessary. It has no permissions, services or key interception. The public source uses original generic artwork rather than bundling a copied YouTube logo or my launcher configuration.

The custom player uses a separate package identity from official Cobalt. Keeping them side by side avoids replacing an upstream-signed app with a locally signed APK and leaves a fallback available.

## Channel filtering needs more than a title match

I extended the channel-blocking work from [upstream PR #720](https://github.com/reisxd/TizenTube/pull/720) . My saved SmartTube preferences stay private. Optional community sources are a separate layer, with independent switches and local exceptions. An explicit personal block takes precedence over a community exception.

Stable channel IDs are the primary match. Name aliases are only a fallback when an ID is missing, and can produce false positives. There are no blanket religious or political keywords, title regexes, imported JavaScript or claims that a channel list can determine truth.

YouTube responses are not a flat list of videos. The filter handles channel cards, grouped results, continuations, Shorts metadata and owner information on shows, podcasts and playlists. Empty shelves need removing too. History, library and explicit-playlist exemptions are retained. This is preference filtering, not a playback-access barrier.

Parsed indexes are cached rather than scanning tens of thousands of channels for every card. Configuration changes invalidate the cache, including changes that mutate an existing array in place.

## The storage limit was the interesting constraint

The combined private snapshot has roughly 62,000 channel IDs. Each record carries a source-membership bitmask, so a channel appearing in several lists only needs one row. The payload is gzip-compressed and base64-encoded before going into localStorage.

Base64 is not free, and this browser counts strings toward a quota in UTF-16 bytes. The deployed origin used about 4.57 MB of a 5.24 MB allowance. A compressed file looking small on disk is not enough to prove it will fit. The builder checks the packed size and rejects excessive shrinkage before replacing an existing output.

The TV decoder also bounds packed input, decompressed bytes and record count. Source commits and file hashes are recorded for provenance. There are no automatic list updates: a published list and a snapshot already saved on the TV are different things.

Importing storage is a maintenance operation, not something to do during somebody's film. Back up the current data, stop the app before an offline database edit, change only the intended keys, and preserve preferences and account state. Never clear or replace the whole profile as an import shortcut.

## Open code does not make every dataset open

The [public list project](https://github.com/akshatagarwl/tv-channel-lists) contains an MIT builder and my independently curated CC0 channel facts. It does not contain personal SmartTube exports, account profiles, fetched third-party datasets or the combined private snapshot.

- AiSList data retains its CC BY-NC 4.0 conditions. The warnlist is not imported.
- Redistribution licensing for SlopTube and MinimalTube is unconfirmed, so their fetched data is not republished.
- My curation requires manual approval and publishes minimal identity and evidence facts, not copied channel descriptions.

These are optional preference filters, not authoritative bias or misinformation ratings. The TizenTube fork retains its upstream license; the builder's MIT license does not relicense either TizenTube or someone else's data.

## Phone installers, with an honest preview boundary

I built a separate [Android-phone and iPhone setup preview](https://github.com/akshatagarwl/tv-setup) . The Android app is native Java; the iPhone app is SwiftUI. Both use a shared catalog for optional official Cobalt, the voice helper and Proton VPN. Nothing is selected by default, and the helper requires the player.

The flow is: connect, read compatibility information, preview the plan, wait for explicit idle-TV consent, verify the selected artifacts, then install only missing packages. The owner profile, Android version and supported app ABIs matter. A 64-bit processor does not prove the TV runs 64-bit apps.

Existing apps are kept unchanged, even if the catalog has another version. Package presence is checked again just before installation. There are no reinstall flags, automatic app launches, accessibility grants, sign-ins, VPN connections or personal-list imports. The preview installs official Cobalt, not my custom filtering build, and does not configure the launcher.

The transport currently supports classic network ADB on a trusted private IPv4 LAN, not Android's pairing-code/TLS protocol. An ADB authorization prompt may appear on the TV. Private-address validation is neither encryption nor proof of the TV's identity, so even connecting should wait for an appropriate setup window. Disable debugging when it is no longer needed.

- Downloads have byte-size, whole-file SHA-256 and publisher pins, with restricted HTTPS redirects and bounded protocol reads. The transport uses a single serialized stream.
- Release preparation verifies complete APK signatures with Android's `apksigner`. The iPhone verifier extracts the signing certificate after checking the whole-file hash; certificate extraction alone is not full signature verification. Android's package manager validates the APK when installing it.
- A pinned Cobalt APK does not pin everything it later runs: official Cobalt loads upstream web scripts. That supply-chain boundary is disclosed rather than hidden behind an APK checksum.
- Cancellation stops unfinished work, but the TV's package manager may finish an installation already submitted. Reconnect and check; there is no automatic destructive rollback.

The [Android phone preview APK](https://github.com/akshatagarwl/tv-setup/releases/tag/v0.1.0-preview) is debug-signed and not hardware-validated. Install it on the phone, not the TV. The iPhone source compiles for a simulator and a generic device, but there is no signed IPA or TestFlight release. Actual iPhone distribution still needs signing, provisioning and device tests.

## VPN installation is not VPN verification

I installed the unmodified official Proton VPN app after checking its release hash, signature and TV compatibility. Sign-in and VPN consent remain on the TV. Credentials and QR tokens are not part of an installer or a public note.

Installation and a reported sign-in do not establish that a tunnel works. Exit location, restricted-video playback, boot-time connection, LAN access and recovery after a disconnect still need testing. I did not silently connect it, buy a subscription, reroute traffic or enable always-on lockdown. Free-plan streaming and country availability are not guaranteed.

## What is actually verified

- On the TV: disabling key filtering restored held-volume repeat. Completed Google searches handed off to Cobalt, including repeated queries; navigation and selected playback worked.
- Filter source switches hid and restored reviewed results and survived restart. An allowed video played with an active media session and no reported playback error.
- The filter has 27 JavaScript tests and the public builder has nine Python tests. The installer was checked with 15 Swift tests, five Python tests and 89 Java checks, including fake ADB peers and local APK fixtures.
- The Android preview builds and its v2/v3 APK signatures verify. The iOS app compiles, but a successful compile is not a phone UI test. Installer development and tests did not contact a live TV or phone.

Still pending: real phone-to-TV installation, foreground/background cancellation and partial-failure tests; a fresh physical microphone, held-volume and playback check on the final setup; VPN and reboot recovery; and a longer memory soak on this 2 GB TV. Sending an ADB Assistant intent cannot reproduce the remote's push-to-talk audio gate, so it is not a substitute for the microphone test.

No root, system wipe, signature bypass or account-profile publication. Working playback is not an acceptable casualty of a background setup experiment.

## Code

- [TizenTube channel-filter fork](https://github.com/akshatagarwl/TizenTube/tree/feat/pr720-channel-block)
- [Public curation and list builder](https://github.com/akshatagarwl/tv-channel-lists)
- [Google-to-Cobalt search handoff](https://github.com/akshatagarwl/tv-search-handoff)
- [Permission-free launcher shortcut](https://github.com/akshatagarwl/tv-youtube-shortcut)
- [Android and iPhone setup preview](https://github.com/akshatagarwl/tv-setup)
