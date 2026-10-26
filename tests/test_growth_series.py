"""The four chapters stay connected, bilingual and honest about unfinished animations."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
import unittest
ROOT=Path(__file__).resolve().parents[1]
SLUGS=('population-growth','births-deaths','growth-rate','growth-curve')
class SeriesNav(HTMLParser):
    def __init__(self):super().__init__();self.inside=False;self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='nav' and 'series-nav' in a.get('class','').split():self.inside=True
        if self.inside and tag=='a':self.links.append(a['href'])
    def handle_endtag(self,tag):
        if tag=='nav':self.inside=False
class GrowthSeries(unittest.TestCase):
    def test_adjacent_chapters_and_language_pairs(self):
        for locale in ('','fr/'):
            for i,slug in enumerate(SLUGS):
                folder=ROOT/locale/'simulations/ecology'/slug
                for alias in ('index.html','play.html'):
                    page=folder/alias;html=page.read_text();nav=SeriesNav();nav.feed(html)
                    expected={SLUGS[0]}
                    if i:expected.add(SLUGS[i-1])
                    if i<3:expected.add(SLUGS[i+1])
                    targets={(page.parent/urlsplit(href).path).resolve() for href in nav.links}
                    self.assertEqual(targets,{ROOT/locale/'simulations/ecology'/s/'play.html' for s in expected})
                    self.assertIn(f'Step {i+1} of 4' if not locale else f'Étape {i+1} sur 4',html)
                    self.assertIn('hreflang="fr"',html);self.assertIn('hreflang="en"',html)
                    body=lambda name:(folder/name).read_text().split('<main id="main">',1)[1].split('</main>',1)[0]
                    self.assertEqual(body('index.html'),body('play.html'))
    def test_new_chapters_are_readable_development_pages_without_fake_controls(self):
        records={e['slug']:e for e in json.loads((ROOT/'content/exhibits.json').read_text())}
        for slug in SLUGS[1:]:
            self.assertTrue(records[slug]['development']);self.assertFalse(records[slug].get('interactive',False))
            folder=ROOT/'simulations/ecology'/slug
            for f in ('illustration.html','MODEL.md','README.md','README.fr.md'):self.assertTrue((folder/f).exists())
            source=(folder/'illustration.html').read_text()
            self.assertIn('Animation in development',source);self.assertNotIn('<input',source);self.assertNotIn('<select',source)
            self.assertNotIn('growth-model.js',source);self.assertNotIn('growth.js?',source)
            self.assertIn('TODO', (folder/'MODEL.md').read_text())
    def test_step_one_has_visible_and_optional_assumption_explanations(self):
        for locale,phrase in [('', 'In this dish, bacteria never die'),('fr/','Dans cette boîte, les bactéries ne meurent jamais')]:
            html=(ROOT/locale/'simulations/ecology/population-growth/play.html').read_text()
            self.assertEqual(html.count(phrase),2)
            self.assertIn(phrase,html.split('</details>')[1])
    def test_french_eating_caption_is_generated_from_the_dictionary(self):
        translations=json.loads((ROOT/'content/locales/fr.json').read_text())
        self.assertEqual(translations['Gulp!'],'Miam !')
        self.assertIn("const GULP_WORD='Miam !'",(ROOT/'fr/simulations/ecology/population-growth/growth-scene.js').read_text())
        self.assertIn("const GULP_WORD='Gulp!'",(ROOT/'simulations/ecology/population-growth/growth-scene.js').read_text())
if __name__=='__main__':unittest.main()
