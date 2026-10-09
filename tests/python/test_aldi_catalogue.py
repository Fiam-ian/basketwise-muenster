import importlib.util
from pathlib import Path
import unittest
spec = importlib.util.spec_from_file_location('aldi', Path(__file__).resolve().parents[2] / 'scripts/extract-aldi-app-catalogue.py')
module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class AldiTests(unittest.TestCase):
    def surface(self, extra='', hidden=False):
        pkg=module.PACKAGE
        def node(key,text,bounds='[0,0][100,100]'):
            return f'<node package="{pkg}" resource-id="{pkg}:id/{key}" text="{text}" bounds="{bounds}"/>'
        return ('<hierarchy>'+node('product_search_edittext','Milch')+
            f'<node package="{pkg}" resource-id="{pkg}:id/product_tile_promotion_123">'+
            node('product_tile_title','Example')+node('product_tile_sales_unit','1-L-Packung')+
            node('price_tag_price','0.99','[0,0][0,0]' if hidden else '[0,0][100,100]')+
            node('price_tag_comparison_price','1.45')+extra+'</node></hierarchy>').encode()
    def test_primary_price_not_reference_price(self):
        row,=module.extract_rows(self.surface(),'Milch')
        self.assertEqual(row['priceCents'],99)
        self.assertEqual(row['nativeListingKind'],'promotion')
        self.assertFalse(row['comparisonEligible'])
        self.assertIsNone(row['depositCents'])
    def test_offscreen_cards_excluded(self):
        self.assertEqual(module.extract_rows(self.surface(hidden=True),'Milch'),[])
    def test_multiple_prices_fail_closed(self):
        extra=f'<node package="{module.PACKAGE}" resource-id="{module.PREFIX}price_tag_price" text="0.50" bounds="[0,0][100,100]"/>'
        self.assertEqual(module.extract_rows(self.surface(extra),'Milch'),[])
    def test_query_and_xml_guards(self):
        with self.assertRaises(ValueError):module.extract_rows(self.surface(),'Eier')
        with self.assertRaises(ValueError):module.extract_rows(b'<!DOCTYPE x><hierarchy/>','Milch')

if __name__=='__main__':unittest.main()
