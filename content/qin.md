---
title: "locking down a qin f21 pro"
description: "Auditing and hardening a keypad Android phone over ADB, without root."
topic: "Qin F21 Pro"
---

The Qin F21 Pro is a small Android keypad phone made by Duoqin. I wanted to keep using it for banking, UPI and 2FA, so I audited it over USB with `adb` and changed what I could without rooting it. Rooting, unlocking the bootloader or flashing a custom ROM would break banking apps, so all of that was ruled out from the start.

The audit was read-only until I chose each change. Nothing from the phone left my laptop.

## The phone

- Android 11 on a MediaTek MT6761, firmware built November 2025.
- Security patch level **2022-06-05**. This is the biggest risk, and nothing on the phone can fix it.
- Bootloader locked and verified boot green, with SELinux enforcing, file-based encryption, release keys and a non-debuggable build. I found no root.
- 223 packages: 219 system and 4 installed from Play. No device admins, no device owner and no VPN were configured.

## Looking for backdoors

I checked per-app network usage, open ports, running processes, boot-time services, accessibility services, notification listeners, device admins and the system framework. Here's what turned up:

- No TCP ports were listening.
- Google Play and Play Services used the most data, which is normal. Nothing unknown stood out.
- The firmware includes Duoqin's factory and diagnostic apps, MediaTek's engineering tools and a modem logger. They are preinstalled and can't be removed.
- `services.jar` contains code for a "Duoqin Guard" app-blocking feature. Its build flag is empty and its settings are unset, so it doesn't look active on this unit.

None of that proves the phone is clean. Without root, an audit only sees what Android lets the shell see. To fill the gap, the phone now runs a local traffic capture for a few days (more on that below).

## What the ROM blocks

This firmware rejects package management over ADB. Commands such as `pm uninstall`, `pm disable-user`, `pm revoke` and `adb install` all just print `Failure`. Owners on the Qin forums report the same thing. Everything below went through the phone's own Settings and installer screens, driven with `input tap` and `uiautomator dump`, or through `settings`, `ime` and `appops`, which still work.

## Settings changed

Before changing anything, I saved the old values so each change can be undone.

- Automatic date, time and time zone turned on.
- Private DNS set to `dns.adguard-dns.com`. If a bank app misbehaves, set it back to Automatic.
- Notification contents hidden on the lock screen.
- Screen timeout cut from 60 to 30 seconds.
- Installing from unknown sources stays blocked, and Bluetooth stays off.
- The Files app got permission to install one APK, which was revoked right after.

## Keyboards

The phone came with Gboard and Duoqin Pinyin. I tried FUTO Keyboard and HeliBoard as touchscreen keyboards and then settled on a single keyboard, [Traditional T9](https://github.com/sspanak/tt9) , which is Apache-2.0 and made for keypads.

- TT9 is installed and set as the only active keyboard.
- FUTO Keyboard and HeliBoard are uninstalled.
- Gboard's updates are uninstalled, and the built-in Gboard Go copy is disabled. It lives in the read-only system partition, so deleting it would need root.
- Duoqin Pinyin is disabled.

## Apps

- **YouTube** is disabled.
- [PCAPdroid](https://github.com/emanuele-f/PCAPdroid) (GPL-3.0, installed from Play) captures every app's connections through a local VPN, with HTTPS decryption off and no certificate installed. Play Store and GitHub builds can't be installed side by side. I verified the capture is running and that Private DNS still works through it.
- [IR Blaster Remote](https://github.com/iodn/android-ir-blaster) (GPL-3.0, Play) drives the phone's IR blaster. It requests camera and microphone access. The microphone is for learning codes from a remote by sound. Both are left ungranted. I found no analytics SDK in its source, and it uses the network for GitHub update checks.
- [Aegis](https://github.com/beemdevelopment/Aegis) is installed alongside Authy. Authy stays until every account has been re-enrolled in Aegis, because Authy has no official export.

## Factory apps that can't be disabled

Seven preinstalled apps have a greyed-out Disable button, and their permissions are fixed by the system:

- Duoqin's `factory_test`, `mmi_test`, `hardwareinfo` and `compatiblemark`
- MediaTek's `engineermode` and `ygps`
- `com.debug.loggerui`

Four of them (the Duoqin ones) share the system phone identity, `android.uid.phone`, with the dialer and SMS stack. Blocking them by package wouldn't contain a process that already holds the phone app's privileges. Blocking that identity as a whole would break calls and SMS. I left them alone and undid one test block.

The other three each have their own identity, so I blocked them with `appops`:

- `engineermode`: camera, microphone, phone state and approximate location.
- `ygps`: approximate location.
- `loggerui`: camera and microphone.

A plain per-package `appops set` was silently dropped for several of these. Setting the mode on the app's own uid ( `appops set --uid`) stuck. Precise location ( `FINE_LOCATION`) wouldn't stick either way, and a storage block only held per package, not on the uid, so I don't count it. The cost is that the phone's built-in hardware tests may not work for a repair shop. To undo a block, run `appops set --uid <package> <op> default`.

## Still to do

Roughly in order of how much each one helps:

1. Install firmware updates whenever Duoqin ships them, and check the updater by hand. The 2022 patch level is the real problem: a malicious web page or message can reach years of fixed bugs.
2. Turn off USB debugging and developer options once the audit is done. With ADB on, anyone holding the unlocked phone and a cable gets a shell.
3. Let PCAPdroid run for two or three days, then export the connections and review them. Any Duoqin or unexpected server it finds can be blocked with a DNS blocklist.
4. Move every 2FA account from Authy to Aegis, keep an encrypted backup off the phone, then remove Authy.
5. Use a screen PIN of at least 6 digits, add a SIM PIN, and turn on Play Protect and Find My Device.
6. Take location, camera, microphone and contacts away from Chrome and Google Messages unless they're needed. Both had them granted by default. Keep location off when not in use.
7. In the Google account, delete the advertising ID and turn off Web & App Activity, Location History and usage & diagnostics.
8. Set low UPI limits and turn on transaction alerts.

## What I didn't do

No root, no bootloader unlock and no custom ROM. LineageOS-based builds for this phone exist, but they need an unlocked bootloader and spoofing to pass integrity checks. That trade-off is wrong for a phone used for UPI. I also didn't delete anything from the system partition. Some community debloat lists remove the dialer, providers and updater, and one Qin owner reports that removing the weather app breaks SystemUI.
