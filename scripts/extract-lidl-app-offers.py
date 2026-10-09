#!/usr/bin/env python3
"""Extract bounded Lidl guest offer evidence without assigning a comparison price."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('android_catalogue', Path(__file__).with_name('extract-android-catalogue.py'))
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
PACKAGE = 'com.lidl.eci.lidlplus'


def parse_xml(raw):
    if len(raw) > 2_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsupported XML source')
    return ET.fromstring(raw)


def visible(node):
    match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
    return bool(match and int(match[3]) > int(match[1]) and int(match[4]) > int(match[2]))


def amount(description, pattern):
    matches = re.findall(pattern, description)
    if len(matches) != 1:
        return None
    major, minor = re.split('[.,]', matches[0])
    return int(major) * 100 + int(minor)


def extract_rows(raw):
    root = parse_xml(raw)
    nodes = [n for n in root.iter('node') if n.get('package') == PACKAGE]
    offers = [n for n in nodes if n.get('text') == 'Angebote' and n.get('class') == 'android.widget.TextView' and visible(n)]
    expanded = any(n.get('selected') == 'true' for n in offers)
    collapsed = (len(offers) == 1 and offers[0].get('selected') == 'false'
                 and offers[0].get('focusable') == 'false'
                 and not any(n.get('text') in ['Coupons', 'Partnervorteile'] for n in nodes)
                 and any(n.get('text') == 'Online' and n.get('class') == 'android.widget.Button'
                         and n.get('checked') == 'false' and visible(n) for n in nodes))
    branch_selected = any(n.get('text') == 'Meine Filiale' and n.get('class') == 'android.widget.Button'
                          and n.get('checked') == 'true' and n.get('checkable') == 'true' and visible(n) for n in nodes)
    if not (expanded or collapsed) or not branch_selected:
        raise ValueError('Expected selected in-store offer surface')
    rows = []
    for card in root.iter('node'):
        if card.get('package') != PACKAGE:
            continue
        children = [n for n in card if n.get('package') == PACKAGE]
        add = [n for n in children if n.get('class') == 'android.widget.Button' and n.get('content-desc') == 'Produkt zur Einkaufsliste hinzufügen']
        titles = [n for n in children if n.get('class') == 'android.widget.TextView' and n.get('text')]
        prices = [n for n in children if 'Verpackungshinweise' in n.get('content-desc', '')]
        validity = [n for n in children if n.get('content-desc', '').startswith('Angebot verfügbar bis')]
        if any(len(field) != 1 for field in [add, titles, prices, validity]):
            continue
        if not all(visible(n) for n in [add[0], titles[0], prices[0], validity[0]]):
            continue
        description = prices[0].get('content-desc')
        rows.append({'productName': titles[0].get('text'), 'priceAndPackDisplay': description,
                     'validityDisplay': validity[0].get('content-desc'),
                     'normalPriceCents': amount(description, r'Normalpreis:\s*(\d{1,5}[.,]\d{2})(?![\d.,])'),
                     'lidlPlusPriceCents': amount(description, r'Mit Lidl Plus\s*,\s*(?:-\d{1,3}%[^,]*,\s*)?(\d{1,5}[.,]\d{2})\s*€'),
                     'referencePriceCents': amount(description, r'Ursprünglicher Preis\s*(\d{1,5}[.,]\d{2})\s*€'),
                     'priceCents': None, 'depositCents': None, 'validFrom': None, 'validTo': None,
                     'comparisonEligible': False, 'inventoryVerified': False})
    return rows


def checked_source(directory, source):
    raw = common.safe_read(directory, source['file'])
    if hashlib.sha256(raw).hexdigest() != source['sha256']:
        raise ValueError('Source hash mismatch')
    if datetime.fromisoformat(source['retrievedAt']).tzinfo is None:
        raise ValueError('Timestamp timezone required')
    return raw


def project(directory):
    manifest = json.loads(common.safe_read(directory, 'manifest.json'))
    if manifest.get('package') != PACKAGE:
        raise ValueError('Manifest package mismatch')
    sources = manifest['sources']
    if not isinstance(sources, list) or not 1 <= len(sources) <= 30:
        raise ValueError('Unsupported capture bounds')
    label = manifest['branchDisplay']
    if not isinstance(label, str) or not 1 <= len(label) <= 300:
        raise ValueError('Unsupported branch display')
    for filename, hashkey in [('branch.xml', 'branchContextSha256'), ('branch-after.xml', 'branchAfterSha256')]:
        raw = common.safe_read(directory, filename)
        if hashlib.sha256(raw).hexdigest() != manifest[hashkey]:
            raise ValueError('Branch hash mismatch')
        context = parse_xml(raw)
        if not any(n.get('package') == PACKAGE and label in (n.get('text', ''), n.get('content-desc', '')) for n in context.iter('node')):
            raise ValueError('Branch display absent from context')
    branch = {k: manifest[k] for k in ['branchDisplay', 'branchContextSha256', 'branchAfterSha256']}
    products = {}
    for source in sources:
        for row in extract_rows(checked_source(directory, source)):
            key = json.dumps(row, sort_keys=True)
            products.setdefault(key, {**row, 'evidence': []})['evidence'].append({k: source[k] for k in ['file', 'sha256', 'retrievedAt']})
    return {'schemaVersion': 1, 'mode': 'lidl_app_offer_candidates', 'package': PACKAGE,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'branchContext': {**branch, 'basis': 'Operator capture-session assertion; separate branch screen.', 'independentlyVerifiedOnProductScreens': False},
            'branchApplicabilityVerified': False, 'priceChannel': 'lidl_app_guest_offers',
            'currency': 'EUR', 'catalogueComplete': False, 'stockVerified': False,
            'scope': 'Visible offer cards only; raw conditions and yearless validity require review.',
            'products': list(products.values())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture-dir', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    private = Path(__file__).resolve().parents[1] / 'local-data'
    if not args.capture_dir.resolve().is_relative_to(private.resolve()) or not args.output.absolute().parent.resolve().is_relative_to(private.resolve()):
        parser.error('Sources and output must remain in local-data')
    result = project(args.capture_dir.resolve())
    descriptor = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as handle:
        handle.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'listings': len(result['products']), 'comparisonEligible': False}))


if __name__ == '__main__':
    main()
