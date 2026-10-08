#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
private_avds="$project_root/prototype/local-data/android-avd"
mkdir -p "$private_avds" "$project_root/prototype/local-data/android-user/avd"
if [[ -e "$private_avds/basketwise-api30.ini" || -e "$private_avds/basketwise-api30.avd" ]]; then
  echo 'Virtual device already exists; preserved.'
  exit 0
fi
mkdir "$private_avds/basketwise-api30.avd"
cat > "$private_avds/basketwise-api30.ini" <<'CONFIG'
avd.ini.encoding=UTF-8
path=/home/chava/avd/basketwise-api30.avd
target=android-30
CONFIG
cat > "$private_avds/basketwise-api30.avd/config.ini" <<'CONFIG'
avd.ini.encoding=UTF-8
AvdId=basketwise-api30
avd.ini.displayname=Basketwise Android 11
abi.type=x86_64
hw.cpu.arch=x86_64
hw.cpu.ncore=2
hw.ramSize=1536
hw.lcd.width=720
hw.lcd.height=1280
hw.lcd.density=240
hw.keyboard=yes
hw.mainKeys=no
hw.gpu.enabled=yes
hw.gpu.mode=software
hw.audioInput=no
hw.audioOutput=no
hw.camera.back=none
hw.camera.front=none
hw.sdCard=no
disk.dataPartition.size=3G
image.sysdir.1=system-images/android-30/google_apis_playstore/x86_64/
tag.id=google_apis_playstore
tag.display=Google Play
PlayStore.enabled=true
fastboot.forceColdBoot=yes
showDeviceFrame=no
CONFIG
chmod 700 "$private_avds" "$private_avds/basketwise-api30.avd"
chmod 600 "$private_avds/basketwise-api30.ini" "$private_avds/basketwise-api30.avd/config.ini"
echo 'Created private Basketwise Android 11 virtual device.'
