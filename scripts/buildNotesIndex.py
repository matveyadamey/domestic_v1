# -*- coding: utf-8 -*-
import json
import os

API = r'C:\Users\matve\.cursor\projects\c-Users-matve-Documents-GitHub-domestic-v1\agent-tools\6c75b54d-3d32-4288-ae65-9a843b0a899e.txt'
OUT = r'c:\Users\matve\Documents\GitHub\domestic_v1\src\res\notesIndex.json'
LOCAL = r'c:\Users\matve\Documents\GitHub\domestic_v1\src\res\index.js'

api = json.load(open(API, encoding='utf-8'))
index = {}
# Prefer standard (Борзый-only / empty opts) over Ломка when writing weak name|pitch keys
weak_candidates = {}
for g in api:
    for s in g['symbols']:
        notes = s.get('notes')
        if not notes or notes == '###':
            continue
        opts = sorted(s.get('opts') or [])
        key = '%s|%s|%s' % (s['name'], s['pitch'], ','.join(opts))
        index[key] = notes
        weak = '%s|%s' % (s['name'], s['pitch'])
        score = 0
        # Prefer entries without Ломка for the default weak key
        if 'Ломка' in opts:
            score -= 10
        if opts == ['Борзый'] or opts == []:
            score += 5
        if 'доп. пометами' in s['name']:
            score -= 1  # keep dedicated names exact; weak key from short name preferred
        prev = weak_candidates.get(weak)
        if prev is None or score > prev[0]:
            weak_candidates[weak] = (score, notes)

for weak, (_score, notes) in weak_candidates.items():
    index[weak] = notes
    # empty-opts exact alias
    name, pitch = weak.split('|', 1)
    index['%s|%s|' % (name, pitch)] = notes

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, separators=(',', ':'))

print('wrote', len(index), 'keys to', OUT)

# Compare with local names - extract via regex from index.js
import re
text = open(LOCAL, encoding='utf-8').read()
local = re.findall(r'"name":"([^"]+)","sounds"[^}]*?"opts":\[([^\]]*)\]|"name":"([^"]+)".*?"pitch":"([^"]+)"', text)
# simpler: find all name and pitch pairs
pairs = re.findall(r'\{"value":"[^"]*","pitch":"([^"]+)","name":"([^"]+)"', text)
print('local pairs', len(pairs))
matched = 0
for pitch, name in pairs[:]:
    # find opts in same object - approximate match by name|pitch
    if ('%s|%s' % (name, pitch)) in index:
        matched += 1
print('matched by name|pitch', matched, '/', len(pairs))
