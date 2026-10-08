#!/usr/bin/env python3
"""Enter REWE's email verification code locally, without displaying or storing it."""
import getpass
import argparse
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[2]
argparse.ArgumentParser(description=__doc__).parse_args()
command = [str(root / 'prototype/scripts/android-sandbox.sh'), 'adb', '-s', 'emulator-5554']
remote = '/data/local/tmp/basketwise-verification.xml'

def adb(*args):
    try:
        return subprocess.run(command + list(args), check=True, capture_output=True, timeout=60).stdout
    except (subprocess.SubprocessError, OSError):
        raise RuntimeError('Android request failed; no credential details are printed.') from None

def nodes():
    adb('shell', 'rm', '-f', remote)
    adb('shell', 'uiautomator', 'dump', remote)
    return list(ET.fromstring(adb('exec-out', 'cat', remote)).iter('node'))

def tap(node):
    bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    if len(bounds) != 4 or bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
        raise RuntimeError('Required verification control is outside the visible screen.')
    adb('shell', 'input', 'tap', str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))

try:
    current = nodes()
    field = next(n for n in current if n.get('resource-id') == 'otpInputElement0')
    code = getpass.getpass('REWE email verification code (hidden): ')
    if not re.fullmatch(r'[0-9]{6}', code):
        raise RuntimeError('Enter exactly six digits.')
    tap(field)
    adb('shell', 'input', 'text', code)
    keyboard = adb('shell', 'dumpsys', 'input_method').decode()
    if 'mInputShown=true' in keyboard:
        adb('shell', 'input', 'keyevent', '4')
    current = nodes()
    actual = ''.join(next(n.get('text', '') for n in current if n.get('resource-id') == f'otpInputElement{i}') for i in range(6))
    if actual != code:
        raise RuntimeError('The verification fields did not receive the complete code; nothing submitted.')
    code = ''
    button = next(n for n in current if n.get('class') == 'android.widget.Button' and n.get('text') == 'Bestätigen')
    tap(button)
    print('Verification submitted. The agent will check whether it succeeded.')
except (StopIteration, ET.ParseError):
    raise SystemExit('REWE verification is not ready. Ask the agent to reopen the email-code screen.')
except RuntimeError as error:
    raise SystemExit(str(error))
finally:
    try:
        adb('shell', 'rm', '-f', remote)
    except RuntimeError:
        pass
