# Native retailer app access — 8 October 2026

The next acquisition trial uses the official REWE Android app in guest mode on a user-controlled Android device. Guest shopping lists and regional offers are supported; whether selected-market search supplies complete, priced shelf inventory is still unverified. Login cannot establish that by itself. The official distribution is [Google Play, package de.rewe.app.mobile](https://play.google.com/store/apps/details?id=de.rewe.app.mobile), linked from [REWE's app page](https://www.rewe.de/service/app/).

## Checked host and installed tools

- WSL2 Ubuntu, x86_64 kernel 6.18.40.1; WSLg display and Wayland available.
- CPU exposes `vmx`. The initial restricted view did not expose `/dev/kvm`; a later native check found the device and loaded kvm/kvm_intel modules. The current user lacks read/write permission because it is not in group kvm. No existing Java, emulator or Android SDK was found in checked Linux paths or standard Windows Android installation paths.
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

The user requested a WSL emulator after declining the physical-phone trial. Installed
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
fails for the current user: native `/dev/kvm` exists (major10/minor232), owned by root:kvm with mode0660, but chava is not in kvm group. No host feature change, reboot or global Java install was made.
The private AVD uses software CPU translation and SwiftShader graphics.

```sh
cd /home/chava/Projects/groceries-compare
prototype/scripts/create-android-avd.sh
prototype/scripts/android-sandbox.sh emulator -avd basketwise-api30 \
  -accel off -gpu swiftshader -feature -Vulkan -no-window \
  -no-audio -no-snapshot -no-boot-anim -show-kernel -cores 2 -memory 2048
```

This is the diagnostic headless configuration. A visible WSLg trial exited
with code 139 after X display errors; GUI operation is not verified. Do not start a second
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

## Boot trial evidence

The initial headless software trial reached the Google boot display but remained
ADB-offline after approximately twelve minutes. Its process and private disk
writes continued, so startup was not treated as usable boot. A second, visible
SwiftShader trial reached zygote, SurfaceFlinger and core services, then exited
with code139; X connection errors were logged. The exact crash cause is not
established. Data was preserved between trials. A third headless/no-animation
trial with Vulkan disabled passed that earlier stop point and started Android
networking, then also exited139. Completed guest boot and retailer access remain
unverified; no emulator is currently left consuming CPU. Original
logs are retained privately as android-emulator-boot.log and v2/v3 variants.

## Corrected KVM finding and next dependency

A native (outside restricted filesystem view) check found `/dev/kvm`, loaded
`kvm` and `kvm_intel`, and the registered KVM misc device. Opening `/dev/kvm`
read/write as chava returns PermissionError. The missing item is access, not
proof that this WSL kernel lacks KVM. Initial missing-device claims above are
superseded by this finding; accelerated VM creation still needs verification.

Sudo requires a local password, so the agent cannot make the group change
unattended. The user was asked to run this in their own WSL terminal:

```sh
sudo usermod -aG kvm chava
```

Once it succeeds, use `sg` to obtain the updated group without rebooting or
restarting WSL. From the project root:

```sh
sg kvm -c 'prototype/scripts/android-sandbox.sh emulator -accel-check'
sg kvm -c 'prototype/scripts/android-sandbox.sh emulator -avd basketwise-api30 -accel on -gpu software -no-window -no-audio -no-snapshot -no-boot-anim -show-kernel -cores 2 -memory 2048'
```

Verify KVM API/VM creation, Android completed boot and display/capture separately.
Neither group membership nor a successful accel-check alone certifies a usable
retailer-app runtime. No Windows feature change or host reboot was made.

## Accelerated runtime verified

The user completed the group change. Native `getent group kvm` lists chava;
`sg kvm` permits KVM API12 access and successful VM creation. Emulator accel-check
returns0 and reports KVM installed and usable. The preserved API30 device then
completed a hardware-accelerated headless boot at roughly49seconds: ADB reports
`device`, and `sys.boot_completed` returns1. A captured launcher image was
inspected. Google Play and Chrome are installed by the official image; no Google
or retailer account is signed in.

The local app was opened through `adb reverse tcp:8013 tcp:8013` at
`http://localhost:8013/app.html`. Actual Android Chrome83 displayed all five
retained product cards. Selecting the shared milk twice produced one basket
line with quantity2 and both branches retained. Screenshots are private.
Compatibility fixes remove dependence on replaceChildren/replaceAll and provide
older-browser viewport/flex spacing fallbacks.

The visible KVM/software-rendered WSLg launch also completed boot. Xwininfo
confirms a mapped Android Emulator window (480x854); ADB remains online and
sys.boot_completed is1. The earlier software-only SwiftShader crashes do not
describe this verified mode.
Once no existing instance is running, launch from the project root with:

```sh
prototype/scripts/run-android-emulator.sh
```

Add `-no-window` for headless capture. This script preserves the device, requires
acceleration, and uses updated group membership explicitly when needed.
Do not launch another instance on top of the running AVD. Official REWE
installation still requires access to Google Play on the virtual device; no
account credentials are collected by these scripts.

REWE's official Play deep link was opened in the visible emulator. Its initial
entry shows Sign in, no Install button, and no network-error label. Google Play
authentication is the next dependency. The user was asked to complete it privately
using an account designated for the project; no password/code/account identity
is collected in chat. No post-login account screen has been captured. Retailer
app installation, selected-market catalogue and shelf-price availability are
still unverified. The local Android browser test needs no Google account.
