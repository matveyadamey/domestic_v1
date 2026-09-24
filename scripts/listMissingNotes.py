# -*- coding: utf-8 -*-
import json
import re
from collections import defaultdict

LOCAL = r'c:\Users\matve\Documents\GitHub\domestic_v1\src\res\index.js'
INDEX = r'c:\Users\matve\Documents\GitHub\domestic_v1\src\res\notesIndex.json'

notes_index = json.load(open(INDEX, encoding='utf-8'))
text = open(LOCAL, encoding='utf-8').read()

# Parse objects: value, pitch, name, sounds, opts
pattern = re.compile(
    r'\{"value":"(?P<value>(?:\\.|[^"\\])*)","pitch":"(?P<pitch>[^"]*)","name":"(?P<name>[^"]*)","sounds":(?P<sounds>[^,]+),"opts":(?P<opts>\[[^\]]*\])\}'
)

missing = []
matched = 0
total = 0

for m in pattern.finditer(text):
    total += 1
    name = m.group('name')
    pitch = m.group('pitch')
    opts_raw = m.group('opts')
    opts = re.findall(r'"([^"]+)"', opts_raw)
    key_exact = '%s|%s|%s' % (name, pitch, ','.join(sorted(opts)))
    key_weak = '%s|%s' % (name, pitch)
    # pitch "-" = равенство: notes resolved at runtime from previous kruk
    if pitch in ('-', ''):
        prefix = '%s|' % name
        has_pitched = any(
            k.startswith(prefix)
            and len(k.split('|')) >= 2
            and k.split('|')[1] not in ('', '-')
            and notes_index.get(k) not in (None, '###')
            for k in notes_index
        )
        if has_pitched:
            matched += 1
            continue
    if key_exact in notes_index or key_weak in notes_index:
        matched += 1
    else:
        missing.append({
            'name': name,
            'pitch': pitch,
            'opts': opts,
        })

# Group by base name (without pitch words at end is hard; group by name field)
by_name = defaultdict(list)
for item in missing:
    by_name[item['name']].append(item)

print('TOTAL', total)
print('MATCHED', matched)
print('MISSING', len(missing))
print('UNIQUE_NAMES', len(by_name))
print('---')
for name in sorted(by_name.keys()):
    items = by_name[name]
    pitches = sorted(set(i['pitch'] for i in items))
    opts_sets = sorted(set(','.join(i['opts']) or '(нет)' for i in items))
    print('%s | pitches: %s | opts: %s | count: %d' % (
        name, ', '.join(pitches), '; '.join(opts_sets), len(items)))
