#!/usr/bin/env python3
"""Project hash-bound ALDI Nord app cards without granting branch or stock claims."""
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
PACKAGE = 'de.aldiNord.android'
PREFIX = PACKAGE + ':id/'
CARD = re.compile(r'^product_tile_([a-z_]+)_(\d+)$')
PRICE = re.compile(r'^(\d{1,5})\.(\d{2})$')

def visible(node):
    numbers = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    return len(numbers) == 4 and numbers[2] > numbers[0] and numbers[3] > numbers[1]

def extract_rows(raw, query):
    if len(raw) > 2_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsupported XML source')
    root = ET.fromstring(raw)
    if not any(n.get('package') == PACKAGE and n.get('resource-id') == PREFIX + 'product_search_edittext' and n.get('text') == query for n in root.iter('node')):
        raise ValueError('Captured query/package mismatch')
    rows = []
    for card in root.iter('node'):
        if card.get('package') != PACKAGE or not card.get('resource-id', '').startswith(PREFIX):
            continue
        match = CARD.fullmatch(card.get('resource-id')[len(PREFIX):])
        if not match:
            continue
        fields = {}
        for node in card.iter('node'):
            if node.get('package') == PACKAGE and node.get('resource-id', '').startswith(PREFIX):
                key = node.get('resource-id')[len(PREFIX):]
                fields.setdefault(key, []).append(node)
        def one(key):
            values = fields.get(key, [])
            return values[0] if len(values) == 1 else None
        name, price, pack = (one(k) for k in ['product_tile_title', 'price_tag_price', 'product_tile_sales_unit'])
        if any(n is None or not visible(n) or not n.get('text') for n in [name, price, pack]):
            continue
        amount = PRICE.fullmatch(price.get('text'))
        if not amount:
            continue
        text = lambda key: one(key).get('text', '') if one(key) is not None else None
        rows.append({'nativeListingRef': card.get('resource-id'), 'nativeListingKind': match[1],
                     'productName': name.get('text'), 'brandDisplay': text('product_tile_brand_name'),
                     'packDisplay': pack.get('text'), 'priceCents': int(amount[1])*100+int(amount[2]),
                     'unitPriceDisplay': text('product_tile_base_price'),
                     'priceFootnoteDisplay': text('price_tag_price_suffix'),
                     'flagsDisplay': [n.get('text') for n in fields.get('flag_chip_text', []) if n.get('text')],
                     'depositCents': None, 'comparisonEligible': False, 'inventoryVerified': False})
    return rows

def project(directory):
    manifest = json.loads(common.safe_read(directory, 'manifest.json'))
    if manifest.get('package') != PACKAGE:
        raise ValueError('Manifest package mismatch')
    sources, query = manifest['sources'], manifest['query']
    if not isinstance(sources, list) or not 1 <= len(sources) <= 30 or not isinstance(query, str) or not 1 <= len(query) <= 100:
        raise ValueError('Unsupported capture bounds')
    products = {}
    for source in sources:
        raw = common.safe_read(directory, source['file'])
        if hashlib.sha256(raw).hexdigest() != source['sha256']:
            raise ValueError('Source hash mismatch')
        if datetime.fromisoformat(source['retrievedAt']).tzinfo is None:
            raise ValueError('Timestamp timezone required')
        for row in extract_rows(raw, query):
            key = json.dumps(row, sort_keys=True)
            products.setdefault(key, {**row, 'evidence': []})['evidence'].append({k: source[k] for k in ['file','sha256','retrievedAt']})
    prices = {}
    for row in products.values():
        prices.setdefault(row['nativeListingRef'], set()).add(row['priceCents'])
    for row in products.values():
        row['priceConflicted'] = len(prices[row['nativeListingRef']]) > 1
    return {'schemaVersion': 1, 'mode': 'aldi_app_candidates', 'package': PACKAGE,
            'query': query, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'priceChannel': 'aldi_app_unmapped_branch', 'branch': None,
            'branchApplicabilityVerified': False, 'currency': 'EUR',
            'currencyBasis': 'German ALDI Nord context; symbol not extracted from UI fields.',
            'validFrom': None, 'validTo': None, 'catalogueComplete': False, 'stockVerified': False,
            'scope': 'Captured visible search cards only; native IDs are listing references, not canonical SKUs.',
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
    print(json.dumps({'query': result['query'], 'listings': len(result['products']), 'branchVerified': False}))

if __name__ == '__main__': main()
