#!/usr/bin/env python3
"""Draw the static, editable sequence and ancestry previews."""
from pathlib import Path
from html import escape
import math

OUT = Path(__file__).resolve().parents[1] / 'assets/illustrations/cartoons'
OUT.mkdir(parents=True, exist_ok=True)
INK = '#276b74'
PAPER = '#fbf5e7'
TEAL, CORAL, YELLOW, GREEN = '#65aaa9', '#ed8268', '#efc568', '#9bb78b'
BASES = {'A': TEAL, 'C': CORAL, 'G': YELLOW, 'T': GREEN}

def rect(x, y, w, h, fill, radius=14, stroke=INK, sw=4):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def line(path, color=INK, width=5):
    return f'<path d="{path}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'

def circle(x, y, r, fill, stroke=INK, sw=4):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def text(x, y, label, size=25, anchor='middle'):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" fill="{INK}" font-family="system-ui,sans-serif" font-size="{size}" font-weight="600">{escape(label)}</text>'

def save(name, title, parts):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-labelledby="title">
<title id="title">{escape(title)}</title>
<rect width="960" height="600" fill="{PAPER}"/>
{''.join(parts)}
</svg>\n'''
    (OUT / f'{name}.svg').write_text(svg)

def chromosome(x, y, colours, letters=None):
    parts = [rect(x-12, y-10, 744, 70, '#e5eee0', 34, stroke='none')]
    for i, colour in enumerate(colours):
        parts.append(rect(x+i*120, y, 106, 50, colour, 17))
        if letters:
            parts.append(text(x+i*120+53, y+34, letters[i], 23))
    return ''.join(parts)

save('recombination', 'Parental chromosomes and two recombinant combinations', [
    text(120, 68, 'Parents', 26, 'start'),
    chromosome(120, 95, [CORAL]*6), chromosome(120, 175, [TEAL]*6),
    line('M380 257 C380 283 580 283 580 310', TEAL),
    line('M580 257 C580 283 380 283 380 310', CORAL),
    text(120, 355, 'New combinations', 26, 'start'),
    chromosome(120, 380, [CORAL]*3+[TEAL]*3),
    chromosome(120, 460, [TEAL]*3+[CORAL]*3),
])
colours = [TEAL, CORAL, YELLOW, GREEN, '#a4bbcf', '#e6b78f']
order = [0, 4, 3, 2, 1, 5]
save('inversions', 'A chromosome segment with reversed marker order', [
    text(120, 115, 'Standard arrangement', 26, 'start'),
    chromosome(120, 155, colours, list('ABCDEF')),
    line('M290 260 C330 335 630 335 670 260', CORAL, 7),
    line('M652 265 L671 258 L676 279', CORAL, 7),
    text(120, 390, 'Inverted arrangement', 26, 'start'),
    chromosome(120, 430, [colours[i] for i in order], [list('ABCDEF')[i] for i in order]),
])
parents = [(480,100), (270,220), (370,340), (700,280)]
edges = [((270,220),(480,100)), ((700,280),(480,100)),
         ((140,480),(270,220)), ((370,340),(270,220)),
         ((300,480),(370,340)), ((430,480),(370,340)),
         ((600,480),(700,280)), ((800,480),(700,280))]
parts = [line('M65 440 V165', '#a1b799', 4), line('M53 181 L65 164 L77 181', '#a1b799', 4), text(65,125,'Past',22)]
for child, parent in edges:
    parts.append(line(f'M{child[0]} {child[1]} V{parent[1]} H{parent[0]}', width=6))
parts.extend(circle(x,y,13,YELLOW) for x,y in parents)
parts.extend(circle(x,480,22, c) for x,c in zip([140,300,430,600,800],[TEAL,CORAL,TEAL,YELLOW,CORAL]))
parts.append(text(480,555,'Sampled gene copies',25))
save('coalescent', 'Sampled gene copies connected through common ancestors', parts)

def sequence(x, y, bases, width=53, height=43, letters=True):
    parts=[]
    for i, base in enumerate(bases):
        parts.append(rect(x+i*width,y,width-6,height,BASES[base],10,sw=3))
        if letters:
            parts.append(text(x+i*width+(width-6)/2,y+height*.72,base,20))
    return ''.join(parts)

reference='ACGTTACGATC'
parts=[]
for row, start in enumerate([0,2,4,1,3]):
    read=reference[start:start+6]
    if row==2:
        read=read[:2]+'T'+read[3:]
    parts.append(sequence(170+start*53,100+row*62,read))
parts.extend([text(170,461,'Reference',24,'start'),sequence(170,480,reference)])
save('read-mapping','Short sequence reads aligned to a reference',parts)
reference='ACGTTACGATCTGA'
parts=[]
for row,(start,length) in enumerate([(0,7),(4,7),(8,6)]):
    parts.append(sequence(138+start*49,100+row*90,reference[start:start+length],49))
parts.extend([line('M480 380 V418', TEAL, 6),line('M468 404 L480 420 L492 404',TEAL,6),sequence(138,460,reference,49)])
save('genome-assembly','Overlapping sequence fragments assembled into a longer sequence',parts)
parts=[rect(465,58,57,422,'#dcebdd',20,stroke='none')]
for row,allele in enumerate('AAGGAG'):
    read='CTAC'+allele+'GTC'
    parts.append(sequence(250,85+row*59,read,53,40))
parts.extend([text(310,520,'One site',24),circle(500,510,27,TEAL),text(500,519,'A',24),circle(580,510,27,YELLOW),text(580,519,'G',24)])
save('variant-calling','Different bases observed at one site across sequencing reads',parts)

def helix(x,y,length,phase=0):
    parts=[]
    def value(t):return math.sin((t+phase)/23)*25
    for t in range(6,length-3,18):
        v=value(t)
        parts.append(line(f'M{x+t} {y+v:.2f} L{x+t} {y-v:.2f}',YELLOW if t%36==6 else GREEN,7))
    for sign,colour in [(1,TEAL),(-1,CORAL)]:
        points=[f'{x+t},{y+sign*value(t):.2f}' for t in range(0,length+1,3)]
        parts.append(f'<polyline points="{" ".join(points)}" fill="none" stroke="{colour}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>')
    return ''.join(parts)
parts=[helix(170,150,620),line('M480 245 V300','#9bb78b',6),line('M468 286 L480 302 L492 286','#9bb78b',6)]
for x,length,phase in [(165,150,0),(430,105,30),(655,150,10)]:
    parts.append(helix(x,410,length,phase))
    parts.append(circle(x,410+math.sin(phase/23)*25,8,YELLOW,sw=2))
    parts.append(circle(x+length,410-math.sin((length+phase)/23)*25,8,YELLOW,sw=2))
save('ancient-dna','A long DNA molecule and shorter fragments with highlighted ends',parts)
print('Prepared 7 static schematics')
