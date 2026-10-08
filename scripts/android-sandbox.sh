#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
android_tools="$project_root/.tools/android"
android_private="$project_root/prototype/local-data"
mkdir -p "$android_private/android-user/avd" "$android_private/android-avd"
if ! command -v bwrap >/dev/null; then echo 'bubblewrap is required for the isolated Android runtime.' >&2; exit 1; fi
case "${1:-}" in
  emulator)
    shift
    binary=/opt/emulator/emulator
    ;;
  adb)
    shift
    binary=/opt/platform-tools/adb
    ;;
  *) echo 'Usage: android-sandbox.sh emulator [arguments] | adb [arguments]' >&2; exit 1 ;;
esac
exec bwrap --ro-bind / / --dev-bind /dev /dev --bind /tmp /tmp \
  --bind "$android_private/android-user" /home/chava \
  --bind "$android_private/android-avd" /home/chava/avd \
  --ro-bind "$android_tools" /opt --chdir /tmp \
  --setenv ANDROID_SDK_ROOT /opt --setenv ANDROID_HOME /opt \
  --setenv ANDROID_AVD_HOME /home/chava/avd --setenv ANDROID_USER_HOME /home/chava/.android \
  --setenv LD_LIBRARY_PATH /opt/emulator/lib64:/tmp/grocery-libs/usr/lib/x86_64-linux-gnu \
  -- "$binary" "$@"
