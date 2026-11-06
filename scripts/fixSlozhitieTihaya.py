# -*- coding: utf-8 -*-
"""Сложитие: «ê» — качка, а не тихая; добавить настоящее сложитие с тихой и задержкой.

Варианты с красным «ê» были подписаны «Тихая» — переименовываем в «Качка».
Тихая помета в каталоге — «+»: ìB! с «+» поётся помета 1/4, ступень ниже 1/2
(Фа → фа ми = м1с2).
"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SCALE = "ЕФГНцгнсмпвМПВ"
PITCHES = [
    ("Í", "Ре низкое", "Н"), ("Ö", "Ми низкое", "ц"), ("ã", "Ут", "г"),
    ("í", "Ре", "н"), ("ö", "Ми", "с"), ("ì", "Фа", "м"), ("ï", "Соль", "п"),
    ("â", "Ля", "в"), ("Î", "Фа высокое", "М"), ("Ï", "Соль высокое", "П"),
]

# --- index.js ---
index_path = "src/res/index.js"
text = open(index_path, encoding="utf-8").read()
m = re.search(r"(export const SLOZHITIE = \[)(.*?)(\n\]\s*\n)", text, re.S)
if not m:
    raise SystemExit("SLOZHITIE block not found")
block = m.group(2)

relabeled = 0


def relabel(match):
    global relabeled
    relabeled += 1
    return match.group(0).replace('"Тихая"', '"Качка"')


block = re.sub(r"\{\"value\":\"<span class='red'>[^<]*ê</span>B[!6]\"[^}]*\"opts\":\[\"Тихая\"[^\]]*\]\}",
               relabel, block)

added = 0
if "+</span>B!" not in block:
    entries = [
        '{"value":"<span class=\'red\'>%s+</span>B!","pitch":"%s","name":"Сложитие","sounds":2,"opts":["Тихая","Задержка"]}'
        % (pometa, pitch)
        for pometa, pitch, _ in PITCHES
    ]
    block = block.rstrip() + ",\n" + ",\n".join(entries)
    added = len(entries)

text = text[: m.start(2)] + block + text[m.end(2):]
open(index_path, "w", encoding="utf-8", newline="\n").write(text)
print("index.js: «Тихая» → «Качка» у %d вариантов с ê, добавлено %d" % (relabeled, added))

# --- notes ---
notes_path = "src/res/notesIndex.json"
idx = json.load(open(notes_path, encoding="utf-8"))
for _, pitch, letter in PITCHES:
    below = SCALE[SCALE.index(letter) - 1]
    idx["Сложитие|%s|Задержка,Тихая" % pitch] = "%s1%s2" % (letter, below)
    print("Сложитие|%s|Задержка,Тихая => %s" % (pitch, idx["Сложитие|%s|Задержка,Тихая" % pitch]))
# бывший «Тихая,Подвертка» с ê — это качка
idx["Сложитие|Соль|Качка,Подвертка"] = idx["Сложитие|Соль|Подвертка,Тихая"]
with open(notes_path, "w", encoding="utf-8") as f:
    json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
