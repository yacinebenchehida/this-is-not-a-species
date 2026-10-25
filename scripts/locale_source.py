from pathlib import Path
import re,json
from html.parser import HTMLParser
R=Path(__file__).resolve().parents[1]
# Exact source ranges let French output share all numerical logic with English.
def js_parts(s):
 out=[]
 def scan(i,stop=False):
  depth=0
  while i<len(s):
   if stop and s[i]=='}' and depth==0:return i+1
   if s.startswith('//',i):
    j=s.find('\n',i);i=len(s) if j<0 else j;continue
   if s.startswith('/*',i):
    j=s.find('*/',i+2);i=len(s) if j<0 else j+2;continue
   ch=s[i]
   if ch in "\"'":
    q=ch;a=i+1;i=a
    while i<len(s):
     if s[i]=='\\':i+=2;continue
     if s[i]==q:out.append((a,i,s[a:i],q));i+=1;break
     i+=1
    continue
   if ch=='`':
    a=i+1;i=a
    while i<len(s):
     if s[i]=='\\':i+=2;continue
     if s.startswith('${',i):
      out.append((a,i,s[a:i],'`'));i=scan(i+2,True);a=i;continue
     if s[i]=='`':out.append((a,i,s[a:i],'`'));i+=1;break
     i+=1
    continue
   if ch=='{':depth+=1
   elif ch=='}':depth-=1
   i+=1
  return i
 scan(0);return out
