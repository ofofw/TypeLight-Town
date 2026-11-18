"""Validate the delivered specification data, not the unimplemented game."""
from pathlib import Path
import json, re, unicodedata
root=Path(__file__).resolve().parent
content=json.loads((root/'content.json').read_text())
items=content['items']; tasks=content['tasks']; byid={x['id']:x for x in items}
assert len(byid)==len(items), 'Duplicate item IDs'
assert len(tasks)==72 and len({t['id'] for t in tasks})==72
assert len({(x['language'],x['target']) for x in items})==len(items)
for lang in ('zh','en'):
 route=[t for t in tasks if t['language']==lang]
 assert [t['sequence'] for t in route]==list(range(1,37))
 for step in (1,2,3):
  group=[t for t in route if t['step']==step]
  assert len(group)==12 and len({t['buildingId'] for t in group})==12
for it in items:
 assert it['target'] and it['target']==unicodedata.normalize('NFC',it['target'])
 assert it['meaning'] and 1<=it['firstTask']<=36
 if it['language']=='zh':
  assert len(it['pinyin'].split())==len(it['target']), it
  assert re.fullmatch(r'[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ ]+',it['pinyin']),it
 else:
  assert re.fullmatch(r'[A-Za-z .?]+',it['target']),it
for t in tasks:
 assert len(t['steps'])==3 and sum(s['targetCount'] for s in t['steps'])==t['targetCount']
 assert t['focusItemIds'] and len(set(t['focusItemIds']))==len(t['focusItemIds'])
 for id in t['focusItemIds']+t['reviewItemIds']:
  assert id in byid and byid[id]['language']==t['language']
  assert byid[id]['firstTask']<=t['sequence'],(t['id'],id)
 for id in t['reviewItemIds']: assert byid[id]['firstTask']<t['sequence']
 assert set(t['newItemIds'])=={id for id in t['focusItemIds'] if byid[id]['firstTask']==t['sequence']}
 assert all(s['title'] and s['prompt'] and s['visualState'] for s in t['steps'])
for it in items:
 assert any(t['language']==it['language'] and t['sequence']==it['firstTask'] and it['id'] in t['newItemIds'] for t in tasks),it
for p in root.glob('*.md'):
 for dest in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if not re.match(r'https?://',dest): assert (p.parent/dest.split('#')[0]).exists(),(p,dest)
# English reading view and JSON must match exactly, including punctuation.
s=(root/'ENGLISH.md').read_text(); a,b=s.split('## 短句'); pairs=[]
for l in a.splitlines():
 c=l.split('|')
 if len(c)==5 and c[1] not in ('主题','---'):
  en=[x.strip() for x in c[2].split(',')]; zh=c[3].split('，')
  assert len(en)==len(zh)
  pairs+=list(zip(en,zh))
for l in b.splitlines():
 c=l.split('|')
 if len(c)==4 and c[1] not in ('目标','---'): pairs.append((c[1],c[2]))
assert set(pairs)=={(i['target'],i['meaning']) for i in items if i['language']=='en'}
print(json.dumps({'status':'PASS','tasks':len(tasks),'chinese_items':sum(i['language']=='zh' for i in items),'english_words':sum(i['language']=='en' and i['kind']=='word' for i in items),'english_sentences':sum(i['kind']=='sentence' for i in items),'checks':['IDs','route order','references','first exposure','step counts','pinyin structure','NFC','English whitelist consistency','Markdown links']},ensure_ascii=False,indent=2))
