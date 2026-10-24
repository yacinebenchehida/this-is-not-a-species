#!/usr/bin/env python3
"""Regenerate the committed static HTML. No build is needed to serve the site."""
from pathlib import Path
from html import escape
ROOT = Path(__file__).resolve().parents[1]
THEMES = [
 ('evolution','Evolution','Natural selection, adaptation, speciation and the many paths life takes.'),
 ('population-genetics','Population Genetics','Chance, inheritance and the changing genetic make-up of populations.'),
 ('ecology','Ecology','Organisms, their neighbours, and the environments they share.'),
 ('genomics','Genomics','From the letters of DNA to the architecture of whole genomes.'),
 ('bioinformatics','Bioinformatics','Exploring the tools that turn biological data into understanding.')]
EXHIBITS = [
 ('population-genetics','genetic-drift','Genetic Drift','See how chance alone can change a population over time.'),
 ('ecology','predator-prey','Predator–Prey Dynamics','Explore the cyclical dance between predators and prey.'),
 ('bioinformatics','sequencing-zoom','Inside an Illumina Sequencer','Zoom from the instrument to the microscopic scale.')]
REPO='https://github.com/yacinebenchehida/this-is-not-a-species'
def art(name,p='',**attrs):
 ext='png' if name in ('butterfly-mule','evolutionary-tree','favicon') else 'webp'
 extra=' '.join(f'{k.replace("_","-")}="{escape(str(v))}"' for k,v in attrs.items())
 return f'<img src="{p}assets/illustrations/{name}.{ext}" alt="" {extra}>'
def identity(p):
 return f'<a class="identity" href="{p}index.html" aria-label="This is not a species. — Home">{art("butterfly-mule",p,width=54,height=54)}<span>This is not a species.</span></a>'
def header(p,active=''):
 links=[('Home',p+'index.html'),('Simulations',p+'index.html#simulations'),('Themes',p+'index.html#themes'),('About',p+'about/')]
 nav=''.join(f'<a href="{url}"'+(' class="active" aria-current="page"' if name==active else '')+f'>{name}</a>' for name,url in links)
 return f'''<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="header-inner">{identity(p)}<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation"><span class="menu-lines" aria-hidden="true"></span><span>Menu</span></button><nav id="navigation" class="nav" aria-label="Main navigation">{nav}</nav></div></header>'''
def footer(p):
 return f'''<footer class="site-footer"><div class="footer-inner">{identity(p)}<p>A personal hobby project with AI-assisted artwork and code. The code has not undergone independent human review. For illustrative and educational exploration, rather than scientific research.</p><a class="github" href="{REPO}">GitHub <span aria-hidden="true">↗</span></a></div></footer>'''
def page(title,body,p='',active=''):
 return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Playful illustrated explorations of evolution, population genetics, ecology, genomics and bioinformatics. A personal science project."><meta name="theme-color" content="#fbf5e7"><title>{escape(title)} — This is not a species.</title><link rel="icon" type="image/png" href="{p}assets/illustrations/favicon.png"><link rel="preload" href="{p}assets/fonts/LaBelleAurore.ttf" as="font" type="font/ttf" crossorigin><link rel="stylesheet" href="{p}shared/styles.css"><script src="{p}shared/app.js" defer></script></head><body>{header(p,active)}<main id="main">{body}</main>{footer(p)}</body></html>\n'''
def feature(ex,p=''):
 theme,slug,title,desc=ex
 return f'''<a class="feature" href="{p}simulations/{theme}/{slug}/">{art(slug,p,width=260,height=170,loading='lazy')}<div class="feature-copy"><h3>{title}</h3><p>{desc}</p><span class="status">Coming soon <span aria-hidden="true">→</span></span></div></a>'''
def theme_card(t,p=''):
 slug,title,_=t
 return f'<a class="theme-card" href="{p}simulations/{slug}/">{art(slug,p,width=280,height=148,loading="lazy")}<h3>{title}<span aria-hidden="true">›</span></h3></a>'
def section_heading(title,caption):
 return f'<div class="section-heading"><h2>{title}</h2><span class="rule" aria-hidden="true"></span><p>{caption}</p></div>'
home=f'''<section class="hero" aria-labelledby="hero-title"><div class="hero-inner"><img class="hero-tree" src="assets/illustrations/evolutionary-tree.png" width="330" height="348" alt="A multicoloured branching tree with a fish, butterfly, bird, frog, mushroom and leaves"><div class="hero-copy"><h1 id="hero-title">This is not a species.</h1><p>Interactive illustrations for evolution,<br class="desktop-break"> genomics, ecology and bioinformatics.</p><div class="actions"><a class="btn primary" href="#simulations">Explore simulations <span aria-hidden="true">→</span></a><a class="btn outline" href="about/">About the project</a></div></div></div></section><div class="content"><section id="themes" class="gallery-section">{section_heading('Explore the themes',"Different lenses on life's complexity.")}<div class="theme-grid">{''.join(theme_card(t) for t in THEMES)}</div></section><section id="simulations" class="gallery-section">{section_heading('Featured simulations','Play, explore, and see ideas come to life.')}<div class="featured-grid">{''.join(feature(x) for x in EXHIBITS)}</div></section></div>'''
(ROOT/'index.html').write_text(page('An illustrated science playground',home,active='Home'))
for t in THEMES:
 slug,title,desc=t;p='../../'
 matching=[ex for ex in EXHIBITS if ex[0]==slug]
 exhibits=f'<div class="featured-grid theme-exhibits">{"".join(feature(ex,p) for ex in matching)}</div>' if matching else '<div class="empty-exhibit"><span class="eyebrow">A little curiosity, in the making</span><h2>New illustrations are taking root.</h2><p>This gallery will grow into a collection of small interactive explorations. The first exhibits are coming soon.</p></div>'
 body=f'''<div class="subpage"><a class="back-link" href="{p}index.html#themes">← Back to the gallery</a><section class="theme-intro"><div><span class="eyebrow">Explore the themes</span><h1>{title}</h1><p>{desc}</p></div>{art(slug,p,width=560,height=296)}</section><section class="exhibit-section"><h2>In this collection</h2>{exhibits}</section><a class="text-link" href="{p}index.html#themes">Explore all five themes <span aria-hidden="true">→</span></a></div>'''
 (ROOT/'simulations'/slug/'index.html').write_text(page(title,body,p,'Themes'))
for theme,slug,title,desc in EXHIBITS:
 p='../../../';theme_title=next(t[1] for t in THEMES if t[0]==theme)
 body=f'''<div class="subpage"><a class="back-link" href="../">← {theme_title}</a><article class="exhibit-detail"><div class="exhibit-picture">{art(slug,p,width=730,height=480)}</div><div class="exhibit-description"><span class="eyebrow">{theme_title}</span><h1>{title}</h1><p class="intro-text">{desc}</p><span class="status">Coming soon</span><p>This interactive illustration is still in the making. There is no working simulation here yet.</p><a class="btn outline" href="../">Explore {theme_title.lower()}</a></div></article></div>'''
 (ROOT/'simulations'/theme/slug/'index.html').write_text(page(title,body,p,'Simulations'))
p='../'
about=f'''<div class="subpage about-page"><a class="back-link" href="../index.html">← Back to the gallery</a><section class="about-intro"><span class="eyebrow">A small cabinet of curiosities</span><h1>This is not a species.</h1><p class="intro-text">A personal playground for exploring life's complexity.</p></section><div class="about-body">{art('evolutionary-tree',p,width=260,height=274)}<div><h2>Made for curiosity</h2><p>This is a hobby project about evolution, population genetics, ecology, genomics and bioinformatics. The idea is simple: small, playful interactive illustrations that make scientific ideas enjoyable to explore.</p><p>The name nods to René Magritte's <em>The Treachery of Images</em> and its inscription, <em>Ceci n'est pas une pipe</em>. A picture of an organism is a representation; a scientific model is one too. Both can help us look more closely.</p><h2>Illustrations, with room to play</h2><p>The galleries are here; the first interactive exhibits are still being made. None of the current simulation previews is a working application.</p><h2>A note on how it is made</h2><p>The artwork and code are AI-generated or AI-assisted. The underlying code has not undergone independent human review. Future applications are intended for illustrative and educational exploration, rather than scientific research or analysis.</p><p>This is a personal project without institutional affiliation.</p><a class="btn outline" href="{REPO}">Visit the GitHub repository <span aria-hidden="true">↗</span></a></div></div></div>'''
(ROOT/'about').mkdir(exist_ok=True)
(ROOT/'about/index.html').write_text(page('About the project',about,p,'About'))
print('Generated 10 static pages')
