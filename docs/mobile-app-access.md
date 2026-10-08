# Native retailer app access — 8 October 2026

The next acquisition trial uses the official REWE Android app in guest mode on a user-controlled Android device. Guest shopping lists and regional offers are supported; whether selected-market search supplies complete, priced shelf inventory is still unverified. Login cannot establish that by itself. The official distribution is [Google Play, package de.rewe.app.mobile](https://play.google.com/store/apps/details?id=de.rewe.app.mobile), linked from [REWE's app page](https://www.rewe.de/service/app/).

## Checked host and installed tools

- WSL2 Ubuntu, x86_64 kernel 6.18.40.1; WSLg display and Wayland available.
- CPU exposes `vmx`; `/dev/kvm` is absent. No existing Java, emulator or Android SDK was found in checked Linux paths or standard Windows Android installation paths.
- Approximately 902 GiB free in the project filesystem. Disk capacity does not resolve missing acceleration.
- Google's official Linux platform-tools archive was downloaded into `/tmp` and extracted into ignored `.tools/android/platform-tools`. Verified adb/fastboot version: **37.0.1-15733141**. Download SHA-256: `d230f13842f60f782a8645f9c813f8f845bf36089ea7289f28c48f17979313f1`. This is the hash of the retrieved archive, not a separately authenticated publisher checksum.
- An isolated adb daemon started successfully; `devices -l` reported no connected devices. No device was paired and no retailer account or app data was accessed.

[Android's acceleration documentation](https://developer.android.com/studio/run/emulator-acceleration) requires usable KVM for Linux VM acceleration. Software CPU emulation can be slow; an emulator image was not downloaded before proving a viable runtime. WSLg supplies a display, not KVM. Windows-host Android Studio/WHPX is a possible later route, but Windows feature changes/reboots and SDK installation have not been performed.

## Runnable device route

[Android's official adb guide](https://developer.android.com/tools/adb) supports wireless debugging on Android 11+ phones on the same wireless network. Use Developer options → Wireless debugging → Pair using pairing code. Enter the temporary pairing code directly in the terminal prompt, not in project files or chat. Pairing and connection ports can differ.

The current adb binary creates its settings from the operating-system home directory; setting `ANDROID_USER_HOME` or `ANDROID_SDK_HOME` did not redirect it in this build. The following namespace keeps generated adb keys in ignored project storage without modifying the host home directory:

```sh
cd /home/chava/Projects/groceries-compare
mkdir -p prototype/local-data/android-user
grocery_adb() {
  bwrap --ro-bind / / --dev-bind /dev /dev --bind /tmp /tmp \
    --bind "$PWD/prototype/local-data/android-user" /home/chava \
    --ro-bind "$PWD/.tools/android" /opt --chdir / \
    -- /opt/platform-tools/adb "$@"
}
grocery_adb version
grocery_adb pair PHONE_IP:PAIRING_PORT
grocery_adb connect PHONE_IP:CONNECTION_PORT
grocery_adb devices -l
```

The shell function uses the current project's absolute directory; run it from the project root. It requires the installed `bwrap` and execution outside the restricted subprocess sandbox. ADB may need explicit `connect` if WSL networking does not discover the phone automatically. No phone endpoint is known yet, so connectivity is not established. USB bridging into WSL was not configured.

Install REWE from its official Play listing on that device, select Geiststraße 2–4, and inspect guest-mode milk search/product details first. Record the selected branch, exact product identity, pack/quantity, displayed price, Pfand, condition/loyalty rules and price channel. Determine whether search entries are suggestions, advertised offers, pickup/delivery listings or actual shelf prices before collecting additional pages. Capture only retailer product surfaces into ignored local-data; exclude account, payment, receipt and personal notifications. Visible UI capture cannot certify a complete catalogue by itself.

No APK mirror, root access, certificate interception, account fabrication or access-control bypass is part of this setup. The missing dependency for the physical-device route is a user-controlled Android device with authorized debugging; a designated retailer account is needed only if a specific product surface requires login.

## User-requested WSL emulator installation

The user requested installation despite the missing phone and KVM. Installed
Google's **Android Emulator 37.2.12 (build 16428233)** and the official
**Android 11/API 30 Google Play x86_64 image, revision 10**, under ignored
`.tools/android`. Downloads came from Google's package repository; exact sizes
and SHA-1 archive checksums were checked against its HTTPS repository metadata.
Emulator archive: 349,654,171 bytes; SHA-1
`cd7362ea55dfb86a418958138dc396e74165dd01`.
System image: 1,404,405,641 bytes; SHA-1
`ead1babced6bdfaa8e641faeb6ed115ca603c4a9`.
These are publisher metadata integrity checks, not an independent signature
verification. Archive manifest and packages remain ignored with the SDK.

The emulator binary runs and lists `basketwise-api30`. The acceleration check
fails because `/dev/kvm` is absent; adding a user to a group would not create
that device. No host feature change, reboot or global Java install was made.
The private AVD uses software CPU translation and SwiftShader graphics.

```sh
cd /home/chava/Projects/groceries-compare
prototype/scripts/create-android-avd.sh
prototype/scripts/android-sandbox.sh emulator -avd basketwise-api30 \
  -accel off -gpu software -no-audio -no-snapshot -no-boot-anim \
  -cores 2 -memory 1536
```

This opens the emulator through WSLg when supported. Add `-no-window` for
headless capture and `-show-kernel` when diagnosing boot. Do not start a second
instance against the same AVD while one is running. The creation script
preserves an existing AVD. SDK paths are mounted as `/opt`, virtual devices as
`/home/chava/avd`, and Android home/keys are inside private local-data through
the namespace wrapper. The API30 image must already be installed in
`.tools/android/system-images/android-30/google_apis_playstore/x86_64`.

Check actual boot, rather than relying on process startup:

```sh
prototype/scripts/android-sandbox.sh adb devices -l
prototype/scripts/android-sandbox.sh adb -s emulator-5554 shell getprop sys.boot_completed
```

Only `device` plus a `sys.boot_completed` value of `1` establishes usable boot.
The first headless trial launched successfully with software rendering; at the
initial several-minute check ADB still reported `offline`. Retailer apps,
Google Play login and branch catalogue access are not verified or installed.
No personal Google/retailer account has been created or used. Install REWE only
from its official Play listing once the runtime is usable; an emulator alone
does not solve source availability or establish inventory completeness.
