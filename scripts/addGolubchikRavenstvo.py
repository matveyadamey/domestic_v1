# -*- coding: utf-8 -*-
"""Add Голубчик равенство / ломка notes to notesIndex by melodic rule.

Rule: upper note = target pitch (равенство = last note of previous kruk).
Голубчик борзый: step below + target, quarters (X1Y1); ломка = skip one (third).
Голубчик тихий: same intervals, halves (X2Y2).
"""
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

PATH = 'src/res/notesIndex.json'

# (pitch name, letter for target Y, letter step-below X, letter ломка-below Z)
# Scale: G N h/ц g n s m p v M P V
PITCHES = [
    # pitch,          Y,   X (2nd below), Z (3rd below / ломка)
    # Full pometa scale incl. малая октава + Ля высокое (were missing → blank staff)
    ('Фа малой',      'Ф', 'Е',           'Е'),
    ('Ут низкое',     'Г', 'Ф',           'Е'),
    ('Ре низкое',     'Н', 'Г',           'Ф'),
    ('Ми низкое',     'ц', 'Н',           'Г'),
    ('Ут',            'г', 'ц',           'Н'),
    ('Ре',            'н', 'г',           'ц'),
    ('Ми',            'с', 'н',           'г'),
    ('Фа',            'м', 'с',           'н'),
    ('Соль',          'п', 'м',           'с'),
    ('Ля',            'в', 'п',           'м'),
    ('Фа высокое',    'М', 'в',           'п'),
    ('Соль высокое',  'П', 'М',           'в'),
    ('Ля высокое',    'В', 'П',           'М'),
]

idx = json.load(open(PATH, encoding='utf-8'))
added = []
updated = []


def put(key, notes):
    prev = idx.get(key)
    if prev == notes:
        return
    if prev is None or prev == '###':
        added.append((key, notes, prev))
    else:
        updated.append((key, notes, prev))
    idx[key] = notes


for pitch, y, x, z in PITCHES:
    borzy = '%s1%s1' % (x, y)
    borzy_lomka = '%s1%s1' % (z, y)
    tihiy = '%s2%s2' % (x, y)

    # Голубчик борзый — base + равенство (+ ломка)
    for opts in ('', 'Равенство'):
        key = 'Голубчик борзый|%s|%s' % (pitch, opts) if opts else 'Голубчик борзый|%s|' % pitch
        put(key, borzy)
    put('Голубчик борзый|%s' % pitch, borzy)
    put('Голубчик борзый|%s|Равенство' % pitch, borzy)
    put('Голубчик борзый|%s|Ломка' % pitch, borzy_lomka)
    put('Голубчик борзый|%s|Ломка,Равенство' % pitch, borzy_lomka)

    # Голубчик тихий — base + равенство
    put('Голубчик тихий|%s' % pitch, tihiy)
    put('Голубчик тихий|%s|' % pitch, tihiy)
    put('Голубчик тихий|%s|Равенство' % pitch, tihiy)

# Explicit равенство-without-pometa keys (pitch "-") are context-dependent;
# store same melodic shapes under Равенство aliases already covered above.
# Also fix broken empty-pitch placeholders from API:
for bad in (
    'Голубчик борзый|',
    'Голубчик борзый||Борзый,Ломка',
    'Голубчик борзый|',
):
    if bad in idx and idx[bad] == '###':
        del idx[bad]
        added.append((bad, '(deleted ###)', '###'))

json.dump(idx, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

print('added/replaced ###:', len(added))
for k, notes, prev in added[:40]:
    print(' +', k, '=>', notes, '(was', prev, ')')
print('updated existing:', len(updated))
for k, notes, prev in updated[:20]:
    print(' ~', k, ':', prev, '->', notes)
print('done, total keys', len(idx))
