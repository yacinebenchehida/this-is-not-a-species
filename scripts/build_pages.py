#!/usr/bin/env python3
"""Regenerate the committed static HTML. No build is needed to serve the site."""
from pathlib import Path
from html import escape
import json
ROOT = Path(__file__).resolve().parents[1]
THEMES = [
 ('evolution','Evolution','Natural selection, adaptation, speciation and the many paths life takes.'),
 ('population-genetics','Population Genetics','Chance, inheritance and the changing genetic make-up of populations.'),
 ('ecology','Ecology','Organisms, their neighbours, and the environments they share.'),
 ('genomics','Genomics','From the letters of DNA to the architecture of whole genomes.'),
 ('bioinformatics','Bioinformatics','Exploring the tools that turn biological data into understanding.')]
EXHIBITS = json.loads((ROOT / 'content/exhibits.json').read_text())
THEME_NAMES = {slug: title for slug, title, _ in THEMES}
FEATURED_SLUGS = ('genetic-drift', 'predator-prey', 'sequencing-zoom')
HOMEPAGE_PREVIEWS = {
 'genetic-drift': {'title':'Genetic Drift', 'description':'See how chance alone can change a population over time.', 'art':'genetic-drift'},
 'predator-prey': {'title':'Predator–Prey Dynamics', 'description':'Explore the cyclical dance between predators and prey.', 'art':'predator-prey'},
 'sequencing-zoom': {'title':'Inside an Illumina Sequencer', 'description':'Zoom from the instrument to the microscopic scale.', 'art':'sequencing-zoom'},
}
REPO='https://github.com/yacinebenchehida/this-is-not-a-species'
def art(name,p='',**attrs):
 ext='png' if name in ('butterfly-mule','evolutionary-tree','favicon') else 'webp'
 asset = name if Path(name).suffix else f'{name}.{ext}'
 extra=' '.join(f'{k.replace("_","-")}="{escape(str(v))}"' for k,v in attrs.items())
 return f'<img src="{p}assets/illustrations/{asset}" alt="" {extra}>'
def identity(p):
 return f'<a class="identity" href="{p}index.html" aria-label="This is not a species. — Home">{art("butterfly-mule",p,width=54,height=54)}<span>This is not a species.</span></a>'
def header(p,active=''):
 links=[('Home',p+'index.html'),('Illustrations',p+'simulations/'),('Themes',p+'index.html#themes'),('About',p+'about/')]
 nav=''.join(f'<a href="{url}"'+(' class="active" aria-current="page"' if name==active else '')+f'>{name}</a>' for name,url in links)
 return f'''<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="header-inner">{identity(p)}<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation"><span class="menu-lines" aria-hidden="true"></span><span>Menu</span></button><nav id="navigation" class="nav" aria-label="Main navigation">{nav}</nav></div></header>'''
def footer(p):
 return f'''<footer class="site-footer"><div class="footer-inner">{identity(p)}<p>A personal hobby project with AI-assisted artwork and code. The code has not undergone independent human review. For illustrative and educational exploration, rather than scientific research.</p><a class="github" href="{REPO}">GitHub <span aria-hidden="true">↗</span></a></div></footer>'''
def page(title,body,p='',active=''):
 return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Playful illustrated explorations of evolution, population genetics, ecology, genomics and bioinformatics. A personal science project."><meta name="theme-color" content="#fbf5e7"><title>{escape(title)} — This is not a species.</title><link rel="icon" type="image/png" href="{p}assets/illustrations/favicon.png"><link rel="preload" href="{p}assets/fonts/LaBelleAurore.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="{p}shared/styles.css"><script src="{p}shared/app.js" defer></script></head><body>{header(p,active)}<main id="main">{body}</main>{footer(p)}</body></html>\n'''
def exhibit_url(ex, p=''):
 return f"{p}simulations/{ex['theme']}/{ex['slug']}/{ex.get('entry', '')}"
def feature(ex, p='', catalogue=False, homepage=False):
 if homepage:
  ex = {**ex, **HOMEPAGE_PREVIEWS[ex['slug']]}
 concept = '' if homepage else f'<span class="concept-label">{escape(ex["concept"])}</span>'
 status = 'Explore illustration' if ex.get('interactive') else 'Coming soon'
 class_name = 'exhibit-card' if catalogue else 'feature'
 return f'''<a class="{class_name}" href="{exhibit_url(ex,p)}">{art(ex['art'],p,width=600,height=400,loading='lazy')}<div class="feature-copy">{concept}<h3>{escape(ex['title'])}</h3><p>{escape(ex['description'])}</p><span class="status">{status} <span aria-hidden="true">→</span></span></div></a>'''
def theme_card(t,p=''):
 slug,title,_=t
 return f'<a class="theme-card" href="{p}simulations/{slug}/">{art(slug,p,width=280,height=148,loading="lazy")}<h3>{title}<span aria-hidden="true">›</span></h3></a>'
def section_heading(title,caption):
 return f'<div class="section-heading"><h2>{title}</h2><span class="rule" aria-hidden="true"></span><p>{caption}</p></div>'
home=f'''<section class="hero" aria-labelledby="hero-title"><div class="hero-inner"><div class="hero-copy"><h1 id="hero-title">Interactive illustrations for evolution,<br class="desktop-break"> genomics, ecology and bioinformatics.</h1><div class="actions"><a class="btn primary" href="simulations/">Explore illustrations <span aria-hidden="true">→</span></a><a class="btn outline" href="about/">About the project</a></div></div></div></section><div class="content"><section id="themes" class="gallery-section">{section_heading('Explore the themes',"Different lenses on life's complexity.")}<div class="theme-grid">{''.join(theme_card(t) for t in THEMES)}</div></section><section id="simulations" class="gallery-section">{section_heading('Featured illustrations','Play, explore, and see ideas come to life.')}<div class="featured-grid">{''.join(feature(next(ex for ex in EXHIBITS if ex['slug']==slug),homepage=True) for slug in FEATURED_SLUGS)}</div><div class="browse-all"><a class="text-link" href="simulations/">Browse all 20 illustrations <span aria-hidden="true">→</span></a></div></section></div>'''
(ROOT/'index.html').write_text(page('An illustrated science playground',home,active='Home'))
for slug,title,desc in THEMES:
 p='../../'
 matching=[ex for ex in EXHIBITS if slug in ex['themes']]
 exhibits=f'<div class="exhibit-grid">{"".join(feature(ex,p,catalogue=True) for ex in matching)}</div>'
 body=f'''<div class="subpage"><a class="back-link" href="{p}index.html#themes">← Back to the gallery</a><section class="theme-intro"><div><span class="eyebrow">Explore the themes</span><h1>{title}</h1><p>{desc}</p></div></section><section class="exhibit-section"><h2>In this collection</h2>{exhibits}</section><a class="text-link" href="{p}simulations/">Browse all illustrations <span aria-hidden="true">→</span></a></div>'''
 (ROOT/'simulations'/slug/'index.html').write_text(page(title,body,p,'Themes'))
for ex in EXHIBITS:
 p='../../../';theme=ex['theme'];theme_title=THEME_NAMES[theme]
 if ex.get('interactive'):
  folder=ROOT/'simulations'/theme/ex['slug']
  body=(folder/'illustration.html').read_text()
  html=page(ex['title'],body,p,'Illustrations')
  (folder/'index.html').write_text(html)
  if ex.get('entry'):
   (folder/ex['entry']).write_text(html)
  continue
 related=' · '.join(f'<a href="{p}simulations/{key}/">{THEME_NAMES[key]}</a>' for key in ex['themes'])
 controls=''.join(f'<li>{escape(label)}</li>' for label in ex['controls'])
 body=f'''<div class="subpage"><a class="back-link" href="../">← {theme_title}</a><article class="exhibit-detail"><div class="exhibit-picture">{art(ex['art'],p,width=730,height=480)}</div><div class="exhibit-description"><span class="eyebrow">{escape(ex['concept'])}</span><h1>{escape(ex['title'])}</h1><p class="intro-text">{escape(ex['detail'])}</p><span class="status">Coming soon</span><p>This illustration is not interactive yet.</p><div class="planned-controls"><h2>What you'll be able to change</h2><ul>{controls}</ul></div><a class="btn outline" href="../">Explore {theme_title.lower()}</a></div></article><p class="related-themes">Explore this idea in {related}</p></div>'''
 folder=ROOT/'simulations'/theme/ex['slug'];folder.mkdir(parents=True,exist_ok=True)
 (folder/'index.html').write_text(page(ex['title'],body,p,'Illustrations'))
p='../'
groups=''.join(f'<section class="catalogue-section" id="{slug}"><div class="section-heading"><h2><a href="{slug}/">{title}</a></h2><span class="rule" aria-hidden="true"></span></div><div class="exhibit-grid">'+''.join(feature(ex,p,catalogue=True) for ex in EXHIBITS if ex['theme']==slug)+'</div></section>' for slug,title,_ in THEMES)
jumps=''.join(f'<a href="#{slug}">{title}</a>' for slug,title,_ in THEMES)
catalogue=f'''<div class="subpage catalogue-page"><a class="back-link" href="../index.html">← Back to the gallery</a><div class="catalogue-intro"><span class="eyebrow">A collection of small worlds</span><h1>Explore the illustrations</h1><p>From a duck pond to the inside of a sequencer, explore the ideas behind life's complexity.</p></div><nav class="catalogue-jumps" aria-label="Browse illustrations by theme">{jumps}</nav>{groups}</div>'''
(ROOT/'simulations/index.html').write_text(page('Explore the illustrations',catalogue,p,'Illustrations'))
p='../'
about=f'''<div class="subpage about-page"><a class="back-link" href="../index.html">← Back to the gallery</a><section class="about-intro"><span class="eyebrow">A small cabinet of curiosities</span><h1>About the project</h1><p class="intro-text">A personal playground for exploring life's complexity.</p></section><div class="about-body"><div><h2>Made for curiosity</h2><p>This is a hobby project about evolution, population genetics, ecology, genomics and bioinformatics. The idea is simple: small, playful interactive illustrations that make scientific ideas enjoyable to explore.</p><p>The name nods to René Magritte's <em>The Treachery of Images</em> and its inscription, <em>Ceci n'est pas une pipe</em>. A picture of an organism is a representation; a scientific model is one too. Both can help us look more closely.</p><h2>A note on how it is made</h2><p>The artwork and code are AI-generated or AI-assisted. The underlying code has not undergone independent human review. The illustrations are intended for educational exploration, rather than scientific research or analysis.</p><p>This is a personal project without institutional affiliation.</p><a class="btn outline" href="{REPO}">Visit the GitHub repository <span aria-hidden="true">↗</span></a></div></div></div>'''
(ROOT/'about').mkdir(exist_ok=True)
(ROOT/'about/index.html').write_text(page('About the project',about,p,'About'))
print(f'Generated {len(EXHIBITS) + len(THEMES) + 3} static pages')
