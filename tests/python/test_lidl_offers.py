import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from xml.sax.saxutils import escape
spec = importlib.util.spec_from_file_location('lidl', Path(__file__).resolve().parents[2] / 'scripts/extract-lidl-app-offers.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class LidlTests(unittest.TestCase):
    def surface(self, description=None, hidden=False, partial=False):
        description = description or 'Ursprünglicher Preis 3,69 €Mit Lidl Plus, -51%, 1,79 €*, Verpackungshinweise Je 330 g Normalpreis: 1.99'
        def node(cls, text='', desc='', hidden=False):
            return f'<node package="{module.PACKAGE}" class="{cls}" text="{escape(text)}" content-desc="{escape(desc)}" bounds="{("[0,0][0,0]" if hidden else "[0,0][100,100]")}"/>'
        return ('<hierarchy><node package="'+module.PACKAGE+'" text="Angebote" class="android.widget.TextView" selected="true" bounds="[0,0][100,100]"/><node package="'+module.PACKAGE+'" text="Meine Filiale" class="android.widget.Button" checkable="true" checked="true" bounds="[0,0][100,100]"/><node package="'+module.PACKAGE+'">'+node('android.widget.Button',desc='Produkt zur Einkaufsliste hinzufügen')+node('android.widget.TextView','Example')+node('android.view.View',desc=description,hidden=hidden)+('' if partial else node('android.view.View',desc='Angebot verfügbar bis In der Filiale 08.10 - 10.10'))+'</node></hierarchy>').encode()
    def test_price_roles_remain_separate(self):
        row, = module.extract_rows(self.surface())
        self.assertEqual((row['normalPriceCents'],row['lidlPlusPriceCents'],row['referencePriceCents']),(199,179,369))
        self.assertIsNone(row['priceCents']); self.assertIsNone(row['validTo']); self.assertFalse(row['comparisonEligible'])
    def test_duplicate_normal_price_unresolved(self):
        row,=module.extract_rows(self.surface('Verpackungshinweise Je 1 kg Normalpreis: 1.99 Normalpreis: 2.99'))
        self.assertIsNone(row['normalPriceCents']);self.assertIsNone(row['lidlPlusPriceCents'])
    def test_partial_hidden_and_wrong_package(self):
        self.assertEqual(module.extract_rows(self.surface(partial=True)),[])
        self.assertEqual(module.extract_rows(self.surface(hidden=True)),[])
        with self.assertRaises(ValueError):module.extract_rows(self.surface().replace(module.PACKAGE.encode(),b'other.package'))
    def test_online_and_missing_surface_rejected(self):
        for raw in [self.surface().replace(b'checked="true"',b'checked="false"'), self.surface().replace(b'selected="true"',b'selected="false"')]:
            with self.assertRaises(ValueError):module.extract_rows(raw)
    def test_collapsed_offer_header(self):
        raw = self.surface().replace(b'selected="true"',b'selected="false" focusable="false"')
        online = f'<node package="{module.PACKAGE}" text="Online" class="android.widget.Button" checked="false" bounds="[0,0][100,100]"/>'.encode()
        raw = raw.replace(b'</hierarchy>',online+b'</hierarchy>')
        self.assertEqual(len(module.extract_rows(raw)),1)
        with self.assertRaises(ValueError):module.extract_rows(raw.replace(b'text="Online"',b'text="Coupons"'))
    def test_unit_price_not_loyalty_price(self):
        row,=module.extract_rows(self.surface('Mit Lidl Plus, Grundpreis 1 kg = 1,99 €, Verpackungshinweise Je 1 kg'))
        self.assertIsNone(row['lidlPlusPriceCents'])
        row,=module.extract_rows(self.surface('Mit Lidl Plus, 1,79 € Mit Lidl Plus, 1,89 €, Verpackungshinweise Je 1 kg'))
        self.assertIsNone(row['lidlPlusPriceCents'])
    def test_xml_guards(self):
        for raw in [b'<!DOCTYPE x><hierarchy/>', b'x'*2_000_001]:
            with self.assertRaises(ValueError): module.extract_rows(raw)
    def test_hash_and_branch_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); raw=self.surface(); branch=f'<hierarchy><node package="{module.PACKAGE}" text="Example Street 17"/></hierarchy>'.encode()
            (root/'screen.xml').write_bytes(raw)
            for filename in ['branch.xml','branch-after.xml']:(root/filename).write_bytes(branch)
            digest=lambda value:hashlib.sha256(value).hexdigest()
            manifest={'package':module.PACKAGE,'branchDisplay':'Example Street 17','branchContextSha256':digest(branch),'branchAfterSha256':digest(branch),'sources':[{'file':'screen.xml','sha256':digest(raw),'retrievedAt':'2026-10-09T10:00:00+00:00'}]}
            (root/'manifest.json').write_text(json.dumps(manifest))
            self.assertEqual(len(module.project(root)['products']),1)
            (root/'screen.xml').write_bytes(raw+b' ')
            with self.assertRaises(ValueError):module.project(root)
            (root/'screen.xml').write_bytes(raw);manifest['branchDisplay']='Example Street';(root/'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(ValueError):module.project(root)

if __name__=='__main__':unittest.main()
