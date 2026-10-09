import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

SPEC = importlib.util.spec_from_file_location('quote', Path(__file__).resolve().parents[2] / 'scripts/extract-rewe-basket-quote.py')
quote = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(quote)


def fixture():
    root = ET.Element('hierarchy')
    app = ET.SubElement(root, 'node', package=quote.PACKAGE)
    def node(parent, text='', description=''):
        return ET.SubElement(parent, 'node', package=quote.PACKAGE, text=text, **{'content-desc': description})
    node(app, 'Warenkorb')
    node(app, description='Synthetic Pasta 250g. Einzelpreis 2,40 €. Ein mal im Warenkorb. Gesamtpreis 2,40 €. ')
    for label, value in [('Produkte (1)', '2.40 €'), ('Einkauf packen', 'Kein Termin gewählt'), ('Gesamtsumme', '2.40 €')]:
        row = node(app)
        node(row, label)
        nested = node(row)
        node(nested, value)
    node(app, quote.NOTICE)
    node(app, '(2,40\u00a0€)')
    return root


class QuoteTests(unittest.TestCase):
    def raw(self, root):
        return ET.tostring(root)

    def test_unknowns_and_whole_pack_counts(self):
        result = quote.extract(self.raw(fixture()))
        self.assertEqual(result['displayedSubtotalCents'], 240)
        self.assertIsNone(result['priceChannel'])
        self.assertEqual(result['channelStatus'], 'not_shown_in_basket_capture')
        self.assertEqual(result['items'][0]['packCount'], 1)
        self.assertFalse(result['comparisonEligible'])
        self.assertTrue(result['displayedSubtotalProvisional'])
        for key in ['checkoutTotalCents', 'packingFeeCents', 'productDepositCents', 'transportBoxDepositCents']:
            self.assertIsNone(result[key])

    def test_wrong_package_title_and_missing_notice(self):
        for change in ['package', 'title', 'notice']:
            root = fixture()
            for n in root.iter('node'):
                if change == 'package': n.set('package', 'other.app')
                if change == 'title' and n.get('text') == 'Warenkorb': n.set('text', 'Home')
                if change == 'notice' and n.get('text') == quote.NOTICE: n.set('text', '')
            with self.assertRaises(ValueError): quote.extract(self.raw(root))

    def test_conflicting_repeated_amounts_and_locale(self):
        for value in ['9.80 €', '4,80 USD', '4.800 €']:
            root = fixture()
            next(n for n in root.iter('node') if n.get('text') == '2.40 €').set('text', value)
            with self.assertRaises(ValueError): quote.extract(self.raw(root))
        root = fixture()
        row = next(n for n in root.iter('node') if any(c.get('text') == 'Produkte (1)' for c in n))
        ET.SubElement(row, 'node', package=quote.PACKAGE, text='2.40 €')
        with self.assertRaises(ValueError): quote.extract(self.raw(root))

    def test_incomplete_items_and_resolved_slot_rejected(self):
        for change in ['count', 'slot', 'unit']:
            root = fixture()
            for n in root.iter('node'):
                if change == 'count' and n.get('text') == 'Produkte (1)': n.set('text', 'Produkte (3)')
                if change == 'slot' and n.get('text') == 'Kein Termin gewählt': n.set('text', '0.00 €')
                if change == 'unit' and n.get('content-desc'): n.set('content-desc', n.get('content-desc').replace('2,40', '2,41'))
            with self.assertRaises(ValueError): quote.extract(self.raw(root))

    def test_multiple_packs_rejected_without_count_semantics(self):
        root = fixture()
        for n in root.iter('node'):
            if n.get('content-desc'):
                n.set('content-desc', n.get('content-desc').replace('Ein mal', 'Zwei mal').replace('Gesamtpreis 2,40', 'Gesamtpreis 4,80'))
            if n.get('text') == '2.40 €': n.set('text', '4.80 €')
            if n.get('text') == '(2,40\u00a0€)': n.set('text', '(4,80\u00a0€)')
        with self.assertRaises(ValueError): quote.extract(self.raw(root))

    def test_xml_security(self):
        for raw in [b'<!DOCTYPE x><hierarchy/>', b'<!ENTITY x "foo"><hierarchy/>', b'x' * (quote.LIMIT + 1)]:
            with self.assertRaises(ValueError): quote.extract(raw)

    def test_hash_private_output_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as temporary:
            private = Path(temporary)
            capture = private / 'capture'
            capture.mkdir()
            raw = self.raw(fixture())
            (capture / 'basket-before-slot.xml').write_bytes(raw)
            result = quote.project(private, 'capture', 'report.json')
            self.assertEqual(result['source']['sha256'], quote.hashlib.sha256(raw).hexdigest())
            self.assertEqual((private / 'report.json').stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads((private / 'report.json').read_text())['checkoutTotalCents'], None)
            with self.assertRaises(FileExistsError): quote.project(private, 'capture', 'report.json')

    def test_symlink_root_directory_source_and_traversal(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            private = base / 'private'
            private.mkdir()
            capture = private / 'capture'
            capture.mkdir()
            (capture / 'basket-before-slot.xml').write_bytes(self.raw(fixture()))
            (base / 'alias').symlink_to(private, target_is_directory=True)
            with self.assertRaises(ValueError): quote.project(base / 'alias', 'capture', 'out.json')
            (private / 'linked').symlink_to(capture, target_is_directory=True)
            with self.assertRaises(ValueError): quote.project(private, 'linked', 'out.json')
            source = capture / 'basket-before-slot.xml'
            source.rename(capture / 'original.xml')
            source.symlink_to(capture / 'original.xml')
            with self.assertRaises(ValueError): quote.project(private, 'capture', 'out.json')
            for name in ['../capture', '/capture', '..']:
                with self.assertRaises(ValueError): quote.project(private, name, 'out.json')


if __name__ == '__main__': unittest.main()
