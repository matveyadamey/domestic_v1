# -*- coding: utf-8 -*-
"""Fill Переводка notes from user rules."""
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

INDEX = 'src/res/notesIndex.json'
idx = json.load(open(INDEX, encoding='utf-8'))

SCALE = ['G', 'N', 'ц', 'г', 'н', 'с', 'м', 'п', 'в', 'М', 'П', 'В']
PITCH_OF = {
    'G': 'Ут низкое', 'N': 'Ре низкое', 'ц': 'Ми низкое',
    'г': 'Ут', 'н': 'Ре', 'с': 'Ми', 'м': 'Фа', 'п': 'Соль', 'в': 'Ля',
    'М': 'Фа высокое', 'П': 'Соль высокое', 'В': 'Ля высокое',
}


def put_exact(name, pitch, opts, notes):
    key = '%s|%s|%s' % (name, pitch, ','.join(sorted(opts)))
    prev = idx.get(key)
    idx[key] = notes
    print('  exact', key, '=>', notes, '' if prev in (None, '###', notes) else '(was %s)' % prev)


def put_weak_if_empty(name, pitch, notes):
    """Set weak key only if missing or ### (don't clobber good борзая)."""
    for key in ('%s|%s' % (name, pitch), '%s|%s|' % (name, pitch)):
        prev = idx.get(key)
        if prev is None or prev == '###':
            idx[key] = notes
            print('  weak ', key, '=>', notes)


name = 'Переводка'

for i, letter in enumerate(SCALE):
    pitch = PITCH_OF[letter]
    # step below / skip-one below
    if i < 1:
        continue
    below = SCALE[i - 1]
    skip = SCALE[i - 2] if i >= 2 else None

    # 1) Борзая: 2 up by ¼, upper = pometa
    borzaya = '%s1%s1' % (below, letter)
    put_exact(name, pitch, ['Борзая'], borzaya)
    put_weak_if_empty(name, pitch, borzaya)

    # Тихая: same interval, halves (quiet)
    tihaya = '%s2%s2' % (below, letter)
    put_exact(name, pitch, ['Тихая'], tihaya)

    # Отсечка with борзая — same pitches (shorten already quarters)
    put_exact(name, pitch, ['Борзая', 'Отсечка'], borzaya)

    # 2) Ломка (+ борзая): 2 up by ¼ through one (third)
    if skip:
        lomka = '%s1%s1' % (skip, letter)
        put_exact(name, pitch, ['Ломка'], lomka)
        put_exact(name, pitch, ['Борзая', 'Ломка'], lomka)

        # 3) Ломка + Подчашие: same + repeat first sound
        lomka_pod = '%s1%s1%s1' % (skip, letter, skip)
        put_exact(name, pitch, ['Ломка', 'Подчашие'], lomka_pod)
        put_exact(name, pitch, ['Борзая', 'Ломка', 'Подчашие'], lomka_pod)

    # 4) Ударка: 3 down by ¼, upper = pometa
    if i >= 2:
        down = '%s1%s1%s1' % (letter, SCALE[i - 1], SCALE[i - 2])
        put_exact(name, pitch, ['Ударка'], down)
        put_exact(name, pitch, ['Борзая', 'Ударка'], down)

# Equality pitch "-" stubs: leave for runtime; clear ### placeholders if only durations
for bad in ('Переводка|', 'Переводка||Тихая'):
    if idx.get(bad) in ('###', '22'):
        del idx[bad]
        print('  del', bad)

json.dump(idx, open(INDEX, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('done, keys', len(idx))

# show examples
print('\nExamples:')
for k in [
    'Переводка|Ми|Борзая',
    'Переводка|Ми|Ломка',
    'Переводка|Ми|Борзая,Ломка',
    'Переводка|Ми|Ломка,Подчашие',
    'Переводка|Ми|Ударка',
    'Переводка|Фа|Борзая',
    'Переводка|Фа|Ломка,Подчашие',
    'Переводка|Соль|Тихая',
]:
    print(' ', k, '=>', idx.get(k))
