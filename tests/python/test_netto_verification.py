import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

spec = importlib.util.spec_from_file_location('netto_verify', Path(__file__).resolve().parents[2] / 'scripts/verify-netto-email.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class NettoVerificationTests(unittest.TestCase):
    def surface(self):
        nodes = [ET.Element('node', {'package': module.PACKAGE, 'text': text})
                 for text in ['sso.netto-online.de', 'Registrierung bestätigen']]
        nodes += [ET.Element('node', {'package': module.PACKAGE, 'class': 'android.widget.EditText',
                  'text': '', 'bounds': f'[{90+i*93},364][{165+i*93},450]'}) for i in range(6)]
        return nodes

    def test_six_fields_sorted_without_identity_or_code_output(self):
        nodes = self.surface()
        self.assertEqual(module.verification_fields(nodes[:2] + list(reversed(nodes[2:]))), nodes[2:])

    def test_wrong_origin_or_unrelated_form_rejected(self):
        for position in [0, 1]:
            nodes = self.surface()
            nodes[position].set('text', 'Unrelated site')
            with self.assertRaises(RuntimeError):
                module.verification_fields(nodes)

    def test_missing_hidden_overlapping_or_second_row_fields_rejected(self):
        with self.assertRaises(RuntimeError):
            module.verification_fields(self.surface()[:-1])
        for bounds in ['[0,0][0,0]', '[90,364][165,450]', '[555,700][630,786]']:
            nodes = self.surface()
            nodes[-1].set('bounds', bounds)
            with self.assertRaises(RuntimeError):
                module.verification_fields(nodes)

if __name__ == '__main__':
    unittest.main()
