#!/usr/bin/env python3
"""Capture bounded Lidl guest offers for an already selected branch, privately."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

PACKAGE = 'com.lidl.eci.lidlplus'
ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--branch-display', required=True)
    parser.add_argument('--screens', type=int, choices=range(1, 31), default=26)
    args = parser.parse_args()
    private = ROOT / 'prototype/local-data'
    output = args.output_dir.absolute()
    if not output.parent.resolve().is_relative_to(private.resolve()):
        parser.error('Output must stay under local-data')
    if not 1 <= len(args.branch_display) <= 150:
        parser.error('Explicit selected branch label required')
    command = [str(ROOT / 'prototype/scripts/android-sandbox.sh'), 'adb', '-s', 'emulator-5554']
    def adb(*arguments):
        return subprocess.run(command + list(arguments), capture_output=True, check=True, timeout=60).stdout
    device_file = '/data/local/tmp/basketwise-lidl-offers.xml'
    def capture():
        adb('shell', 'rm', '-f', device_file)
        adb('shell', 'uiautomator', 'dump', device_file)
        raw = adb('exec-out', 'cat', device_file)
        if len(raw) > 2_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
            raise ValueError('Unsupported XML source')
        tree = ET.fromstring(raw)
        if not any(n.get('package') == PACKAGE for n in tree.iter('node')):
            raise ValueError('Lidl surface missing')
        return raw, tree
    def tap(tree, text):
        matches = [n for n in tree.iter('node') if n.get('package') == PACKAGE and n.get('text') == text]
        if len(matches) != 1:
            raise ValueError('Expected unique control: ' + text)
        bounds = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', matches[0].get('bounds', ''))
        if not bounds:
            raise ValueError('Control bounds missing')
        left, top, right, bottom = map(int, bounds.groups())
        if right <= left or bottom <= top:
            raise ValueError('Control hidden')
        adb('shell', 'input', 'tap', str((left + right)//2), str((top + bottom)//2))
    def texts(tree):
        return {n.get('text') for n in tree.iter('node') if n.get('package') == PACKAGE}
    try:
        _, tree = capture()
        tap(tree, 'Home')
        context, tree = capture()
        if args.branch_display not in texts(tree):
            raise ValueError('Expected selected branch missing')
        output.mkdir(mode=0o700)
        def save(name, raw):
            with (output/name).open('xb') as handle:
                handle.write(raw)
            (output/name).chmod(0o600)
        save('branch.xml', context)
        tap(tree, 'Lidl Plus')
        _, tree = capture()
        tap(tree, 'Angebote')
        _, tree = capture()
        tap(tree, 'Meine Filiale')
        sources, prior, repeated = [], None, False
        for index in range(args.screens):
            raw, tree = capture()
            if not {'Angebote', 'Meine Filiale'}.issubset(texts(tree)):
                raise ValueError('Lost in-branch offer surface')
            signature = tuple((n.get('text'), n.get('content-desc'), n.get('bounds')) for n in tree.iter('node') if n.get('package') == PACKAGE)
            if signature == prior:
                repeated = True
                break
            name = f'screen-{index+1}.xml'
            save(name, raw)
            sources.append({'file': name, 'sha256': hashlib.sha256(raw).hexdigest(), 'retrievedAt': datetime.now(timezone.utc).isoformat()})
            print(json.dumps({'capturedScreen': index+1}), flush=True)
            prior = signature
            if index < args.screens-1:
                adb('shell', 'input', 'swipe', '360', '1030', '360', '460', '500')
        tap(tree, 'Home')
        after, tree = capture()
        if args.branch_display not in texts(tree):
            raise ValueError('Selected branch changed during capture')
        save('branch-after.xml', after)
        manifest = {'package': PACKAGE, 'branchDisplay': args.branch_display,
                    'branchContextSha256': hashlib.sha256(context).hexdigest(),
                    'branchAfterSha256': hashlib.sha256(after).hexdigest(),
                    'sources': sources, 'stoppedOnRepeatedScreen': repeated,
                    'catalogueComplete': False}
        save('manifest.json', (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode())
    finally:
        adb('shell', 'rm', '-f', device_file)

if __name__ == '__main__':
    main()
