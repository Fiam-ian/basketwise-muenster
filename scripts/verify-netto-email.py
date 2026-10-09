#!/usr/bin/env python3
"""Enter Netto's email code privately through its ordinary Android browser form."""
import argparse
import getpass
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

SCRIPTS = Path(__file__).resolve().parent
PACKAGE = 'com.android.chrome'
REMOTE = '/data/local/tmp/basketwise-netto-verification.xml'

def verification_fields(nodes):
    browser = [n for n in nodes if n.get('package') == PACKAGE]
    if not any(n.get('text') == 'sso.netto-online.de' for n in browser):
        raise RuntimeError('The official Netto login origin is not visible.')
    if not any('Registrierung bestätigen' == n.get('text') for n in browser):
        raise RuntimeError('Netto email verification is not ready.')
    fields = [n for n in browser if n.get('class') == 'android.widget.EditText']
    if len(fields) != 6:
        raise RuntimeError('Expected six verification fields; nothing submitted.')
    def bounds(node):
        match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
        if not match:
            raise RuntimeError('Verification field bounds missing.')
        left, top, right, bottom = map(int, match.groups())
        if right <= left or bottom <= top:
            raise RuntimeError('Verification field hidden.')
        return left, top, right, bottom
    fields.sort(key=lambda node: bounds(node)[0])
    boxes = [bounds(node) for node in fields]
    if max(box[1] for box in boxes) - min(box[1] for box in boxes) > 10 or any(a[2] >= b[0] for a, b in zip(boxes, boxes[1:])):
        raise RuntimeError('Unexpected verification field layout.')
    return fields

def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    command = [str(SCRIPTS / 'android-sandbox.sh'), 'adb', '-s', 'emulator-5554']
    def adb(*args):
        try:
            return subprocess.run(command + list(args), check=True, capture_output=True, timeout=60).stdout
        except (subprocess.SubprocessError, OSError):
            raise RuntimeError('Android operation failed; credential details are suppressed.') from None
    def nodes():
        adb('shell', 'rm', '-f', REMOTE)
        adb('shell', 'uiautomator', 'dump', REMOTE)
        return list(ET.fromstring(adb('exec-out', 'cat', REMOTE)).iter('node'))
    def tap(node):
        match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
        if not match:
            raise RuntimeError('Control bounds missing.')
        left, top, right, bottom = map(int, match.groups())
        if right <= left or bottom <= top:
            raise RuntimeError('Control hidden.')
        adb('shell', 'input', 'tap', str((left+right)//2), str((top+bottom)//2))
    try:
        fields = verification_fields(nodes())
        if any(n.get('text') for n in fields):
            raise RuntimeError('Verification fields already contain text; ask the agent to check them.')
        code = getpass.getpass('Netto email verification code (hidden): ')
        if not re.fullmatch(r'\d{6}', code):
            raise RuntimeError('Enter exactly six digits.')
        tap(fields[0])
        adb('shell', 'input', 'text', code)
        if b'mInputShown=true' in adb('shell', 'dumpsys', 'input_method'):
            adb('shell', 'input', 'keyevent', '4')
        current = nodes()
        if ''.join(n.get('text', '') for n in verification_fields(current)) != code:
            raise RuntimeError('The code was not entered completely; nothing submitted.')
        code = ''
        buttons = [n for n in current if n.get('package') == PACKAGE and n.get('resource-id') == 'btnSubmit' and n.get('class') == 'android.widget.Button' and n.get('text') == 'Bestätigen']
        if len(buttons) != 1:
            raise RuntimeError('Unique confirmation control missing; nothing submitted.')
        tap(buttons[0])
        print('Verification submitted. The agent will check whether it succeeded.')
    except ET.ParseError:
        raise SystemExit('The verification screen is not ready; ask the agent to reopen it.')
    except RuntimeError as error:
        raise SystemExit(str(error))
    finally:
        try:
            adb('shell', 'rm', '-f', REMOTE)
        except RuntimeError:
            pass

if __name__ == '__main__':
    main()
