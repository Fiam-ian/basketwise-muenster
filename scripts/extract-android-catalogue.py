#!/usr/bin/env python3
"""Project private, bounded Android product surfaces; never infer inventory."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

PACKAGE = 'de.rewe.app.mobile'
PRICE = re.compile(r'^(?P<name>.+?)\. (?P<euros>\d{1,5}),(?P<cents>\d{2})\s*€\. (?P<tail>.*?)Produktdetails öffnen\.\s*$')

def xml_nodes(raw):
    if len(raw) > 2_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsupported XML source')
    root = ET.fromstring(raw)
    return [n for n in root.iter('node') if n.get('package') == PACKAGE]

def extract_rows(raw, query):
    nodes = xml_nodes(raw)
    if not any(n.get('text') == query for n in nodes):
        raise ValueError('Search query does not match captured surface')
    rows = []
    for node in nodes:
        match = PRICE.fullmatch(node.get('content-desc', ''))
        if not match:
            continue
        fields = match.groupdict()
        rows.append({'productName': fields['name'],
                     'priceCents': int(fields['euros']) * 100 + int(fields['cents']),
                     'packAndLabelsDisplay': fields['tail'].strip(),
                     'depositCents': None, 'comparisonEligible': False,
                     'inventoryVerified': False})
    return rows

def safe_read(directory, name):
    if not isinstance(name, str) or Path(name).name != name or name in {'.', '..'}:
        raise ValueError('Source must be an immediate child file')
    path = directory / name
    if path.is_symlink() or not path.is_file():
        raise ValueError('Unsupported source file')
    return path.read_bytes()

def project(directory, branch_display):
    manifest = json.loads(safe_read(directory, 'manifest.json'))
    context = safe_read(directory, 'branch.xml')
    if hashlib.sha256(context).hexdigest() != manifest['branchContextSha256']:
        raise ValueError('Branch source hash mismatch')
    if not any(n.get('text') == branch_display for n in xml_nodes(context)):
        raise ValueError('Selected pickup branch not found in context')
    if not branch_display.startswith('Abholen | '):
        raise ValueError('Only explicit pickup context is supported')
    sources = manifest['sources']
    if not isinstance(sources, list) or not 1 <= len(sources) <= 30:
        raise ValueError('Unsupported source count')
    query = manifest['query']
    if not isinstance(query, str) or not 1 <= len(query) <= 100:
        raise ValueError('Unsupported query')
    products = {}
    for source in sources:
        raw = safe_read(directory, source['file'])
        if hashlib.sha256(raw).hexdigest() != source['sha256']:
            raise ValueError('Product source hash mismatch')
        captured = datetime.fromisoformat(source['retrievedAt'])
        if captured.tzinfo is None:
            raise ValueError('Capture timestamp must include timezone')
        for row in extract_rows(raw, query):
            key = (row['productName'], row['priceCents'], row['packAndLabelsDisplay'])
            if key not in products:
                products[key] = {**row, 'evidence': []}
            products[key]['evidence'].append({k: source[k] for k in ('file', 'sha256', 'retrievedAt')})
    prices_by_name = {}
    for row in products.values():
        prices_by_name.setdefault(row['productName'], set()).add(row['priceCents'])
    for row in products.values():
        row['priceConflicted'] = len(prices_by_name[row['productName']]) > 1
    return {'schemaVersion': 1, 'mode': 'android_pickup_candidates',
            'package': PACKAGE, 'branchDisplay': branch_display,
            'branchContextSha256': manifest['branchContextSha256'],
            'branchApplicabilityVerified': False,
            'branchBinding': 'Operator capture-session assertion; product search screens do not repeat the branch header.',
            'query': query, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'priceChannel': 'pickup', 'validFrom': None, 'validTo': None,
            'stockVerified': False, 'catalogueComplete': False,
            'scope': 'Captured search screens only; membership, packs, Pfand and checkout remain unreviewed.',
            'products': list(products.values())}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture-dir', required=True, type=Path)
    parser.add_argument('--branch-display', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    private = Path(__file__).resolve().parent.parent / 'local-data'
    directory = args.capture_dir.resolve()
    output = args.output.absolute()
    if not directory.is_relative_to(private.resolve()) or not output.parent.resolve().is_relative_to(private.resolve()):
        parser.error('Captures and output must remain under project local-data')
    report = project(directory, args.branch_display)
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as handle:
        handle.write(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'products': len(report['products']), 'catalogueComplete': False, 'priceChannel': 'pickup'}))

if __name__ == '__main__':
    main()
