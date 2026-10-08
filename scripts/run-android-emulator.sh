#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
if [[ ! -x "$project_root/.tools/android/emulator/emulator" || ! -f "$project_root/.tools/android/system-images/android-30/google_apis_playstore/x86_64/system.img" ]]; then
  echo 'The project-local Android emulator and API30 Google Play image are required.' >&2
  exit 1
fi
"$project_root/prototype/scripts/create-android-avd.sh"
android_window=(-no-window)
android_extra=()
for android_argument in "$@"; do
  if [[ "$android_argument" == --show-window ]]; then
    android_window=()
  else
    android_extra+=("$android_argument")
  fi
done
android_launch=("$project_root/prototype/scripts/android-sandbox.sh" emulator -avd basketwise-api30 -accel on -gpu software -no-audio -no-snapshot -no-boot-anim -cores 2 -memory 2048 "${android_window[@]}" "${android_extra[@]}")
if [[ ! -r /dev/kvm || ! -w /dev/kvm ]]; then
  # sg reads updated group membership without restarting WSL or the calling shell.
  android_group_members=",$(getent group kvm | cut -d: -f4),"
  android_current_user=$(id -un)
  if [[ "$android_group_members" != *",$android_current_user,"* ]]; then
    echo 'KVM access is required. Ask the device owner to add this user to group kvm.' >&2
    exit 1
  fi
  printf -v android_launch_quoted '%q ' "${android_launch[@]}"
  exec sg kvm -c "$android_launch_quoted"
fi
exec "${android_launch[@]}"
