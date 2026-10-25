"""Contracts for static routing, complete page pairs and French SVG accessibility."""
import unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.lang=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang')
  for k in ['src','href']:
   if a.get(k):self.links.append(a[k])
class Locales(unittest.TestCase):
 def test_every_product_page_has_a_complete_french_counterpart(self):
  pages=[ROOT/'index.html',*ROOT.glob('about/**/*.html'),*ROOT.glob('simulations/**/*.html')]
  pages=[p for p in pages if p.name not in ['illustration.html','motion-fragment.html']]
  for page in pages:
   fr=ROOT/'fr'/page.relative_to(ROOT)
   self.assertTrue(fr.exists(),str(fr));parsed=Links();parsed.feed(fr.read_text());self.assertEqual(parsed.lang,'fr')
   self.assertIn('hreflang="en"',fr.read_text());self.assertIn('hreflang="fr"',fr.read_text())
 def test_all_localized_assets_and_internal_links_exist(self):
  for page in (ROOT/'fr').rglob('*.html'):
   parsed=Links();parsed.feed(page.read_text())
   for link in parsed.links:
    url=urlsplit(link)
    if url.scheme or url.netloc or not url.path:continue
    target=(page.parent/unquote(url.path)).resolve()
    if target.is_dir():target=target/'index.html'
    self.assertTrue(target.exists(),f'{page}: {link}')
 def test_french_navigation_stays_french(self):
  page=ROOT/'fr/index.html';parsed=Links();parsed.feed(page.read_text())
  for link in parsed.links:
   url=urlsplit(link)
   if url.scheme or url.netloc or not url.path:continue
   target=(page.parent/url.path).resolve()
   if target.suffix=='.html' or target.is_dir():
    if target==ROOT/'index.html':continue # Explicit EN switch.
    self.assertTrue(target.is_relative_to(ROOT/'fr'),link)
 def test_french_schematics_are_valid_svg(self):
  for p in (ROOT/'fr/assets').rglob('*.svg'):ET.parse(p)
 def test_translation_preserves_svg_geometry_and_case_sensitive_attributes(self):
  for source in (ROOT/'assets/illustrations').rglob('*.svg'):
   english=list(ET.parse(source).getroot().iter())
   french=list(ET.parse(ROOT/'fr'/source.relative_to(ROOT)).getroot().iter())
   self.assertEqual(len(english),len(french),str(source))
   for en,fr in zip(english,french):
    self.assertEqual(en.tag,fr.tag,str(source))
    visual=lambda e:{k:v for k,v in e.attrib.items() if k not in ['alt','title','aria-label']}
    self.assertEqual(visual(en),visual(fr),f'{source}: {en.tag}')
if __name__=='__main__':unittest.main()
