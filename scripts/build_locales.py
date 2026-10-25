"""Build French pages and presentation strings from the shared English source.

Numerical/model code is reused unchanged. Only literal text ranges are localized.
Run through build_pages.py; do not edit generated fr/ files.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape,unescape
import json,re,posixpath
from urllib.parse import urlsplit,urlunsplit
from locale_source import js_parts
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'content/locales/fr.json').read_text())
# Terms used in the former English copy remain aliases for catalogue maintenance.
ALIASES={k.replace('illustrations','animations').replace('Illustrations','Animations').replace('illustration','animation'):v for k,v in D.items()}
D.update(ALIASES)
UNCHANGED={'This is not a species.','Menu','GitHub','Ceci n\'est pas une pipe','Zoom','Pause','Normal'}
missing=set()
def text(s,strict=False):
 k=unescape(s.strip())
 if not k:return s
 if k in D:return s[:len(s)-len(s.lstrip())]+D[k]+s[len(s.rstrip()):]
 if k in UNCHANGED or not re.search('[A-Za-z]',k):return s
 # Titles and linked theme labels can be composed from separately translated strings.
 if k.endswith(' — This is not a species.'):
  return text(k[:-len(' — This is not a species.')],strict)+' — This is not a species.'
 if strict:missing.add(k)
 return s
class Page(HTMLParser):
 def __init__(self,path):super().__init__(convert_charrefs=True);self.path=path;self.out=[]
 def handle_decl(self,d):self.out.append('<!'+d+'>')
 def handle_entityref(self,n):self.out.append('&'+n+';')
 def handle_charref(self,n):self.out.append('&#'+n+';')
 def handle_comment(self,d):self.out.append('<!--'+d+'-->')
 def handle_starttag(self,t,attrs):
  out=[]
  for k,v in attrs:
   if v is None:out.append(k);continue
   if k=='lang':v='fr'
   elif k in ['alt','title','aria-label','aria-valuetext','placeholder'] or t=='meta' and k=='content' and any(a=='name' and b=='description' for a,b in attrs):v=text(v,True)
   elif k in ['href','src']:
    u=urlsplit(v)
    if not u.scheme and not u.netloc and u.path:
     target=posixpath.normpath(posixpath.join(str(self.path.parent),u.path))
     # All internal page links stay in French; numerical code, artwork and CSS are shared.
     local=target.startswith(('simulations/','about/')) or target in ['index.html','simulations','about']
     ispage=target.endswith('.html') or '.' not in target.rsplit('/',1)[-1]
     localized=local and ispage or target.endswith('.js') and '/genetic-drift/' in target and not target.endswith(('model.js','family-model.js','duck-character.js','duck-mesh.js')) or target.endswith('.svg')
     dest=('fr/'+target) if localized else target
     new=posixpath.relpath(dest, 'fr/'+str(self.path.parent))
     if u.path.endswith('/') and not new.endswith('/'):new+='/'
     v=urlunsplit(('', '',new,u.query,u.fragment))
   out.append(f'{k}="{escape(v,quote=True)}"')
  self.out.append('<'+t+(' '+' '.join(out) if out else '')+'>')
 def handle_startendtag(self,t,attrs):
  self.handle_starttag(t,attrs);self.out[-1]=self.out[-1][:-1]+'/>'
 def handle_endtag(self,t):self.out.append('</'+t+'>')
 def handle_data(self,d):self.out.append(escape(text(d,True),quote=False))

def localize_js(s,name):
 # Keep stable English keys for CSS classes and tally keys. Localize colour names only in prose.
 if name in ['drift.js','motion.js']:
  s=s.replace("const capital = word => word[0].toUpperCase() + word.slice(1);", "const capital = word => word[0].toUpperCase() + word.slice(1);")
  s=s.replace("    const colour =", "    const colourLabel = allele => allele ? 'turquoise' : 'corail';\n    const colour =")
  s=s.replace('${colour(', '${colourLabel(')
  s=s.replace('allele-swatch ${colourLabel(', 'allele-swatch ${colour(')
  s=s.replace("waiting ? 'waiting' : colour(value)", "waiting ? 'waiting' : colour(value)")
  s=s.replace("colour(value) + ' allele'", "colourLabel(value) + ' allele'")
  s=s.replace('const fixed = colour(population[0][0]), lost = colour(1 - population[0][0]);', 'const fixed = colourLabel(population[0][0]), lost = colourLabel(1 - population[0][0]);')
  s=s.replace('tally[fixed]++', 'tally[colour(population[0][0])]++')
  s=s.replace("colour(value) + ' allele'", "colourLabel(value) + ' allele'")
  s=s.replace('capital(fixed)', 'capital(fixed)').replace('capital(lost)','capital(lost)')
  s=s.replace('colour(family.alleles[0])[0]', 'colourLabel(family.alleles[0])[0]').replace('colour(family.alleles[0]).slice', 'colourLabel(family.alleles[0]).slice').replace('colour(family.alleles[1])[0]', 'colourLabel(family.alleles[1])[0]').replace('colour(family.alleles[1]).slice', 'colourLabel(family.alleles[1]).slice')
 if name=='replicates.js':
  s=s.replace("pond.fixedTo ? 'teal' : 'coral'", "pond.fixedTo ? 'turquoise' : 'corail'").replace("pond.fixedTo ? 'Teal' : 'Coral'", "pond.fixedTo ? 'Turquoise' : 'Corail'")
 # These literals are structural keys, not display labels.
 protected={'teal','coral','chosen','waiting','fixed','many','compare','use strict','generation'}
 def fragment(v):
  if v.strip() in protected:return v
  if v.strip() in D:return text(v)
  # Translate complete visible runs inside markup and partial template clauses.
  return re.sub(r'[^<>]+',lambda m: clause(m.group()),v)
 def clause(v):
  # Protect HTML attributes except human-readable labels. Template tails may begin with attributes.
  if re.search(r'\b(?:class|style|viewBox|stroke|fill|x|y|cx|cy)=',v):
   for en,fr in [('Teal share started at','La proportion de turquoise était de'),('Teal share in each','Proportion de turquoise dans chaque'),('Teal share of gene copies','Proportion de copies turquoise'),('Ducks with both colours (heterozygotes)','Canards portant les deux couleurs (hétérozygotes)'),('Generation','Génération')]:v=v.replace(en,fr)
   return v
  if v.strip() in D:return text(v)
  for en in sorted(D,key=len,reverse=True):
   if len(en)>12 and en in v:v=v.replace(en,D[en])
  return v
 for a,b,v,q in sorted(js_parts(s),reverse=True):
  translated=fragment(v)
  if translated!=v:
   if q in ["'",'"']:translated=translated.replace('\\','\\\\').replace(q,'\\'+q).replace('\n','\\n')
   else:translated=translated.replace('`','\\`')
   s=s[:a]+translated+s[b:]
 # Locale-safe stage highlighting: displayed translations must not be compared to English labels.
 if name=='motion.js':s=s.replace("String(button.textContent === s[0])", "String(Number(button.dataset.stage) === ({ Swim:0, Meet:.26, Dance:.43, Share:.61, Splash:.765, 'Hello!':.88, Nage:0, Rencontre:.26, Parade:.43, Transmission:.61, 'Éclaboussure':.765, 'Bienvenue !':.88 })[s[0]])")
 # Grammar across template-expression boundaries is reviewed explicitly.
 s=s.replace("? 'generation' : 'générations'", "? 'génération' : 'générations'")
 s=s.replace('Proportion de turquoise dans chaque of ', 'Proportion de turquoise dans chacune des ')
 s=s.replace('} . Les deux', '}. Les deux')
 s=s.replace("generation.toLocaleString()", "generation.toLocaleString('fr-FR')")
 s=s.replace('`${capital(fixed)} est fixé', '`L’allèle ${fixed} est fixé')
 s=s.replace('`${capital(lost)} a disparu', '`L’allèle ${lost} a disparu')
 s=s.replace("${n} ${n === 1 ? 'canard' : 'canards'} n’ont transmis", "${n} ${n === 1 ? 'canard n’a' : 'canards n’ont'} transmis")
 s=s.replace("' fixed'", "' fixé'")
 s=s.replace("${runs} terminée(s) ${runs === 1 ? 'expérience' : 'expériences'}", "${runs} ${runs === 1 ? 'expérience terminée' : 'expériences terminées'}")
 s=s.replace("${ghosts.length} précédente ${ghosts.length === 1 ? 'expérience' : 'expériences'}", "${ghosts.length} ${ghosts.length === 1 ? 'expérience précédente' : 'expériences précédentes'}")
 s=s.replace('`Seulement ${fixed} est présent', '`Seul l’allèle ${fixed} est présent')
 s=s.replace("colourLabel(value) + ' allèle'", "'allèle ' + colourLabel(value)")
 if name=='drift.js':
  s=s.replace("const percent = value => `${(value * 100).toFixed(1).replace(/\\.0$/, '')}%`;", "const percent = value => new Intl.NumberFormat('fr-FR', {style:'percent',maximumFractionDigits:1}).format(value);")
 if name=='replicates.js':s=s.replace("const percent = v => `${Math.round(v * 100)}%`;", "const percent = v => new Intl.NumberFormat('fr-FR', {style:'percent',maximumFractionDigits:0}).format(v);")
 s=s.replace('}%</text>', '} %</text>')
 return s

def language_links(html,path,lang):
 html=re.sub(r'<link rel="alternate" hreflang="(?:en|fr)"[^>]*>', '', html)
 base=path.parent if lang=='en' else Path('fr')/path.parent
 en=posixpath.relpath(str(path),str(base));fr=posixpath.relpath('fr/'+str(path),str(base))
 label='Language' if lang=='en' else 'Langue'
 links=f'<div class="language-switch" role="group" aria-label="{label}"><a href="{en}" lang="en" hreflang="en"'+(' aria-current="true"' if lang=='en' else '')+'>EN</a><span aria-hidden="true">/</span><a href="'+fr+'" lang="fr" hreflang="fr"'+(' aria-current="true"' if lang=='fr' else '')+'>FR</a></div>'
 html=html.replace('</nav></div></header>', '</nav>'+links+'</div></header>',1)
 origin='https://yacinebenchehida.github.io/this-is-not-a-species/'
 alternates=f'<link rel="alternate" hreflang="en" href="{origin}{path}"><link rel="alternate" hreflang="fr" href="{origin}fr/{path}">'
 return html.replace('</head>',alternates+'</head>')

def build():
 pages=[p for p in ROOT.rglob('*.html') if not any(x in p.relative_to(ROOT).parts for x in ['fr','.preview','.git']) and p.name not in ['illustration.html','motion-fragment.html'] and (p.relative_to(ROOT).parts[0] in ['about','simulations'] or p.relative_to(ROOT).as_posix()=='index.html')]
 for p in pages:
  rel=p.relative_to(ROOT);parser=Page(rel);parser.feed(p.read_text());out=''.join(parser.out)
  # A language can recommend a different reference while retaining the English source.
  out=re.sub(r'<p data-localized-fragment="([^"]+)">.*?</p>', lambda m: '<p data-localized-fragment="'+m[1]+'">'+D['html:'+m[1]]+'</p>', out, flags=re.S)
  dest=ROOT/'fr'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(language_links(out,rel,'fr'))
  p.write_text(language_links(p.read_text(),rel,'en'))
 for p in (ROOT/'simulations/population-genetics/genetic-drift').glob('*.js'):
  if p.name in ['model.js','family-model.js','duck-character.js','duck-mesh.js']:continue
  dest=ROOT/'fr'/p.relative_to(ROOT);dest.write_text(localize_js(p.read_text(),p.name))
 for p in (ROOT/'assets/illustrations').rglob('*.svg'):
  # DNA letters stay unchanged; captions and accessible descriptions are translated.
  rel=p.relative_to(ROOT);parser=Page(rel);parser.feed(p.read_text());dest=ROOT/'fr'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(''.join(parser.out))
 if missing:
  (ROOT/'content/locales/missing-fr.json').write_text(json.dumps(sorted(missing),ensure_ascii=False,indent=2))
  raise RuntimeError(f'{len(missing)} untranslated page strings; see content/locales/missing-fr.json')
 print(f'Generated {len(pages)} French pages and localized presentation scripts.')
if __name__=='__main__':build()
