# -*- coding: utf-8 -*-
"""Add standalone notes from user rules; fix catalog typos."""
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

INDEX = 'src/res/notesIndex.json'
LOCAL = 'src/res/index.js'

idx = json.load(open(INDEX, encoding='utf-8'))

# Scale low → high (letters as stored in notes strings)
SCALE = ['G', 'N', 'ц', 'г', 'н', 'с', 'м', 'п', 'в', 'М', 'П', 'В']
PITCH_OF = {
    'G': 'Ут низкое', 'N': 'Ре низкое', 'ц': 'Ми низкое',
    'г': 'Ут', 'н': 'Ре', 'с': 'Ми', 'м': 'Фа', 'п': 'Соль', 'в': 'Ля',
    'М': 'Фа высокое', 'П': 'Соль высокое', 'В': 'Ля высокое',
}


def put(key, notes):
    prev = idx.get(key)
    idx[key] = notes
    mark = 'new' if prev is None else ('same' if prev == notes else 'upd %s→%s' % (prev, notes))
    print(' ', key, '=>', notes, '(%s)' % mark)


def exact(name, pitch, opts, notes):
    opts_part = ','.join(sorted(opts))
    put('%s|%s|%s' % (name, pitch, opts_part), notes)
    put('%s|%s' % (name, pitch), notes)
    put('%s|%s|' % (name, pitch), notes)


# --- 1. Крюк Ми низкое + Ломка + Подчашие: ми–до половинками ---
# existing Равенство variant is ц2Г2
print('=== Крюк Ми низкое Ломка+Подчашие ===')
exact('Крюк Ми низкое', 'Ми низкое', ['Ломка', 'Подчашие'], 'ц2Г2')
# typo pitch still in catalog until we fix index.js
exact('Крюк Ми низкое', 'Ми низкоенизкое ', ['Ломка', 'Подчашие'], 'ц2Г2')
exact('Крюк Ми низкое', 'Ми низкоенизкое', ['Ломка', 'Подчашие'], 'ц2Г2')

# --- 2. Челюстка: один звук целая; missing Ут низкое under name «Ут и Фа» ---
print('=== Челюстка ===')
for letter, pitch in PITCH_OF.items():
    # names in catalog vary
    for name in (
        'Челюстка Ут и Фа' if pitch in ('Ут низкое', 'Ут', 'Фа') else None,
        'Челюстка Ре' if 'Ре' in pitch else None,
        'Челюстка Ми' if 'Ми' in pitch else None,
        'Челюстка Ут низкое' if pitch == 'Ут низкое' else None,
        'Челюстка',
    ):
        if not name:
            continue
        exact(name, pitch, [], letter + '4')

# --- 3. Мечик: три вниз, 1-я восьмая, 2–3 четверти; верх = помета; все высоты ---
print('=== Мечик ===')
for i, letter in enumerate(SCALE):
    if i < 2:
        continue  # need two steps below
    pitch = PITCH_OF[letter]
    a, b, c = letter, SCALE[i - 1], SCALE[i - 2]
    notes = '%s!%s1%s1' % (a, b, c)
    exact('Мечик', pitch, ['Ударка', 'Подвертка'], notes)
    exact('Мечик', pitch, [], notes)

# --- 4. Стрела громосветлая Борзая+Подчашие: 3 вверх + 1 вниз; 1 1 2 2 ---
# top of ascent = pometa; then step down
print('=== Стрела громосветлая Борзая+Подчашие ===')
# for each top pitch, build X Y Z Y with durations 1 1 2 2 where Z=pometa
gromo = {
    'Ми': 'г1н1с2н2',
    'Фа': 'н1с1м2с2',
    'Соль': 'с1м1п2м2',
    'Ля': 'м1п1в2п2',
}
for pitch, notes in gromo.items():
    for name in (
        'Стрела громосветлая %s' % pitch,
        'Стрела громосветлая Ля' if pitch == 'Ля' else None,
    ):
        if not name:
            continue
        exact(name, pitch, ['Борзая', 'Подчашие'], notes)
        exact(name, pitch, ['Борзая', 'Громосветлая', 'Подчашие'], notes)
# catalog bug: named «Ля» but pitch Фа — notes by pitch (Фа); rename in index.js
exact('Стрела громосветлая Ля', 'Фа', ['Борзая', 'Подчашие'], 'н1с1м2с2')
exact('Стрела громосветлая Фа', 'Фа', ['Борзая', 'Подчашие'], 'н1с1м2с2')

# --- 5. Стрела мрачная: 2 вверх половинками, верх = помета ---
print('=== Стрела мрачная ===')
for i, letter in enumerate(SCALE):
    if i < 1:
        continue
    pitch = PITCH_OF[letter]
    low, high = SCALE[i - 1], letter
    notes = '%s2%s2' % (low, high)
    exact('Стрела мрачная Фа' if pitch == 'Фа' else 'Стрела мрачная', pitch, [], notes)
    exact('Стрела мрачная Фа' if pitch == 'Фа' else 'Стрела мрачная', pitch, ['Равенство'], notes)
    # also named variants
    if pitch == 'Фа':
        exact('Стрела мрачная Фа', 'Фа', [], notes)
        exact('Стрела мрачная Фа', 'Фа', ['Равенство'], notes)
        exact('Стрела мрачная Ут и Фа', 'Фа', [], notes)
        exact('Стрела мрачная Ут и Фа', 'Фа', ['Мрачная', 'Тихая'], notes)

json.dump(idx, open(INDEX, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', len(idx), 'keys')

# Fix catalog typos in index.js
text = open(LOCAL, encoding='utf-8').read()
text2 = text.replace(
    '"pitch":"Ми низкоенизкое ","name":"Крюк Ми низкое"',
    '"pitch":"Ми низкое","name":"Крюк Ми низкое"',
)
# Misnamed: pitch Фа but name «…Ля» → rename to Фа
text2 = text2.replace(
    '"pitch":"Фа","name":"Стрела громосветлая Ля","sounds":"4","opts":["Борзая","Подчашие"]',
    '"pitch":"Фа","name":"Стрела громосветлая Фа","sounds":"4","opts":["Борзая","Подчашие"]',
)
if text2 != text:
    open(LOCAL, 'w', encoding='utf-8').write(text2)
    print('fixed index.js typos')
else:
    print('index.js: no typo strings replaced (check manually)')
