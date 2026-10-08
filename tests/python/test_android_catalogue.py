import importlib.util
from pathlib import Path
import unittest
import tempfile
import json
import hashlib
spec = importlib.util.spec_from_file_location('catalogue', Path(__file__).resolve().parents[2] / 'scripts/extract-android-catalogue.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CatalogueTests(unittest.TestCase):
    def surface(self, description, package=module.PACKAGE):
        return f'<hierarchy><node package="{module.PACKAGE}" text="Milch"/><node package="{package}" content-desc="{description}"/></hierarchy>'.encode()
    def test_integer_price_and_unknown_pack_review(self):
        row, = module.extract_rows(self.surface('Example Milch 3,8% 1l. 1,25 €. Tiefpreis. 1l. Produktdetails öffnen.'), 'Milch')
        self.assertEqual(row['priceCents'], 125)
        self.assertEqual(row['packAndLabelsDisplay'], 'Tiefpreis. 1l.')
        self.assertFalse(row['comparisonEligible'])
        self.assertIsNone(row['depositCents'])
    def test_wrong_surface_and_nonretailer_rows(self):
        with self.assertRaises(ValueError): module.extract_rows(self.surface('Example. 1,25 €. 1l. Produktdetails öffnen.'), 'Eier')
        self.assertEqual(module.extract_rows(self.surface('Example. 1,25 €. 1l. Produktdetails öffnen.', 'other'), 'Milch'), [])
    def test_entity_declarations_rejected(self):
        with self.assertRaises(ValueError): module.xml_nodes(b'<!DOCTYPE hierarchy><hierarchy/>')
    def test_nonproduct_and_ambiguous_prices_not_parsed(self):
        self.assertEqual(module.extract_rows(self.surface('Coupon. ab 1,25 €. Bedingungen.'), 'Milch'), [])

    def test_source_hashes_and_branch_assertion(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            context = self.surface('unused').replace(b'text="Milch"', b'text="Abholen | Example"')
            source = self.surface('Example. 1,25 €. 1l. Produktdetails öffnen.')
            (path / 'branch.xml').write_bytes(context)
            (path / 'screen.xml').write_bytes(source)
            manifest = {'branchContextSha256': hashlib.sha256(context).hexdigest(), 'query': 'Milch', 'sources': [
                {'file': 'screen.xml', 'sha256': hashlib.sha256(source).hexdigest(), 'retrievedAt': '2026-10-08T10:00:00+00:00'}]}
            (path / 'manifest.json').write_text(json.dumps(manifest))
            report = module.project(path, 'Abholen | Example')
            self.assertFalse(report['branchApplicabilityVerified'])
            self.assertFalse(report['catalogueComplete'])
            self.assertIsNone(report['validTo'])
            with self.assertRaises(ValueError): module.project(path, 'Abholen | Another')
            (path / 'screen.xml').write_bytes(source + b' ')
            with self.assertRaises(ValueError): module.project(path, 'Abholen | Example')
    def test_source_paths_reject_links_and_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            (path / 'source').write_text('source')
            (path / 'link').symlink_to(path / 'source')
            for name in ['../source', 'link']:
                with self.assertRaises(ValueError): module.safe_read(path, name)

if __name__ == '__main__': unittest.main()
