#!/usr/bin/env python3
"""Extract a private provisional REWE basket snapshot; never a checkout total."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET

PACKAGE = 'de.rewe.app.mobile'
LIMIT = 2_000_000
MONEY = re.compile(r'(0|[1-9]\d{0,5})[.,](\d{2})[ \u00a0]€')
ITEM = re.compile(r'^(.+?)\. Einzelpreis ((?:0|[1-9]\d{0,5}),\d{2} €)\. (Ein|Zwei|Drei|Vier|Fünf|Sechs|Sieben|Acht|Neun|Zehn) mal im Warenkorb\. Gesamtpreis ((?:0|[1-9]\d{0,5}),\d{2} €)\.\s*$')
COUNTS = ['Ein','Zwei','Drei','Vier','Fünf','Sechs','Sieben','Acht','Neun','Zehn']
NOTICE = 'Wir bieten dir Pfand-Transportboxen für deine Einkäufe an.'


def cents(value):
    match = MONEY.fullmatch(value)
    if not match:
        raise ValueError('Unsupported EUR amount format')
    return int(match[1]) * 100 + int(match[2])


def extract(raw):
    if len(raw) > LIMIT or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError('Unsupported XML source')
    root = ET.fromstring(raw)
    nodes = list(root.iter('node'))
    if any(n.get('package') not in (None, '', PACKAGE, 'com.android.systemui') for n in nodes):
        raise ValueError('Unexpected source package')
    own = [n for n in nodes if n.get('package') == PACKAGE]
    if sum(n.get('text') == 'Warenkorb' for n in own) != 1:
        raise ValueError('REWE basket title required')
    parents = {child: parent for parent in root.iter() for child in parent}

    def row_value(label):
        labels = [n for n in own if n.get('text') == label]
        if len(labels) != 1:
            raise ValueError('Unique basket row required')
        parent = parents[labels[0]]
        values = [n.get('text') for n in parent.iter('node') if n.get('package') == PACKAGE and MONEY.fullmatch(n.get('text', ''))]
        if len(values) != 1:
            raise ValueError('Unique row amount required')
        return cents(values[0])

    product_labels = [n.get('text') for n in own if re.fullmatch(r'Produkte \([1-9]\d{0,2}\)', n.get('text', ''))]
    if len(product_labels) != 1:
        raise ValueError('Explicit product count required')
    count = int(re.search(r'\d+', product_labels[0])[0])
    subtotal = row_value(product_labels[0])
    total = row_value('Gesamtsumme')
    if subtotal != total:
        raise ValueError('Pre-slot subtotal conflict')
    packing = [n for n in own if n.get('text') == 'Einkauf packen']
    if len(packing) != 1 or [n.get('text') for n in parents[packing[0]].iter('node') if n.get('text')] != ['Einkauf packen', 'Kein Termin gewählt']:
        raise ValueError('Expected unresolved pre-slot packing fee')
    if sum(n.get('text') == NOTICE for n in own) != 1:
        raise ValueError('Explicit transport-box notice required')
    items = []
    for n in own:
        description = n.get('content-desc', '')
        if 'Einzelpreis' not in description and 'Gesamtpreis' not in description:
            continue
        match = ITEM.fullmatch(description)
        if not match:
            raise ValueError('Unsupported basket item description')
        quantity = COUNTS.index(match[3]) + 1
        unit, line = cents(match[2]), cents(match[4])
        if unit * quantity != line:
            raise ValueError('Basket item amount conflict')
        items.append({'productName': match[1], 'packCount': quantity,
                      'displayedUnitPriceCents': unit, 'displayedLinePriceCents': line})
    if count != 1 or len(items) != 1 or items[0]['packCount'] != 1 or items[0]['displayedLinePriceCents'] != subtotal:
        raise ValueError('Visible basket coverage or amount conflict')
    checkout = [n.get('text') for n in own if re.fullmatch(r'\((?:0|[1-9]\d{0,5}),\d{2}\u00a0€\)', n.get('text', ''))]
    if len(checkout) != 1 or cents(checkout[0][1:-1]) != subtotal:
        raise ValueError('Checkout button amount conflict')
    return {'schemaVersion': 1, 'mode': 'rewe_preslot_basket_quote', 'package': PACKAGE,
            'priceChannel': None, 'channelStatus': 'not_shown_in_basket_capture',
            'supportedScope': 'one_visible_line_one_pack', 'currency': 'EUR', 'items': items,
            'displayedItemCount': count, 'displayedSubtotalCents': subtotal,
            'displayedSubtotalProvisional': True, 'checkoutTotalCents': None,
            'packingFeeCents': None, 'packingFeeStatus': 'no_slot_selected',
            'productDepositCents': None, 'transportBoxDepositCents': None,
            'transportBoxDepositNotice': NOTICE, 'comparisonEligible': False,
            'branchApplicabilityVerified': False, 'inventoryVerified': False,
            'validFrom': None, 'validTo': None}


def basename(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,119}', value) or value in ('.', '..'):
        raise ValueError('Immediate-child basename required')
    return value


def project(private, capture_dir, output):
    private = Path(private).absolute()
    if private.resolve() != private or not private.is_dir():
        raise ValueError('Private root must be a real directory')
    directory = private / basename(capture_dir)
    source = directory / 'basket-before-slot.xml'
    if directory.resolve() != directory or not directory.is_dir() or source.resolve() != source or not source.is_file() or source.stat().st_size > LIMIT:
        raise ValueError('Source must be a bounded regular unlinked capture')
    raw = source.read_bytes()
    result = extract(raw)
    result['source'] = {'file': capture_dir + '/basket-before-slot.xml', 'sha256': hashlib.sha256(raw).hexdigest()}
    result['generatedAt'] = datetime.now(timezone.utc).isoformat()
    target = private / basename(output)
    if not output.endswith('.json'):
        raise ValueError('JSON output required')
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as handle:
        handle.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture-dir', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    try:
        result = project(Path(__file__).resolve().parents[1] / 'local-data', args.capture_dir, args.output)
    except (ValueError, OSError, ET.ParseError) as error:
        parser.error(str(error))
    print(json.dumps({'mode': result['mode'], 'visibleItemCount': result['displayedItemCount'], 'comparisonEligible': False, 'checkoutTotalKnown': False}))


if __name__ == '__main__':
    main()
