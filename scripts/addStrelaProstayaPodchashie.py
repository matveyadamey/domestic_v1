# -*- coding: utf-8 -*-
"""Add Стрела простая с подчашием: pometa is the upper (last) note.

Step below, two steps below, pometa — 1/2 1/2 1. Фа → ми ре фа = с2н2м4.
"""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SCALE = ["Е", "Ф", "Г", "Н", "ц", "г", "н", "с", "м", "п", "в", "М", "П", "В"]
LETTER = {
    "Ут низкое": "Г", "Ре низкое": "Н", "Ми низкое": "ц",
    "Ут": "г", "Ре": "н", "Ми": "с", "Фа": "м", "Соль": "п", "Ля": "в",
    "Фа высокое": "М",
}

FAMILY = "Статья мрачная (стрела простая) "
# (pometa_char, body, pitch, name suffix, opts) — same bodies as STRELA_PROSTAYA + подчашие «4»
VARIANTS = [
    ("Ã", "SJ", "Ут низкое", "Ут и Фа", []),
    ("Í", "WJ", "Ре низкое", "Ре и Соль", []),
    ("Ö", "SK", "Ми низкое", "Ми", []),
    ("ã", "SJ", "Ут", "Ут и Фа", []),
    ("í", "WJ", "Ре", "Ре и Соль", []),
    ("ö", "SK", "Ми", "Ми", []),
    ("ì", "SJ", "Фа", "Ут и Фа", []),
    ("ð", "SJ", "Фа", "Ут и Фа", ["Равенство"]),
    ("ï", "DJ", "Соль", "Ре и Соль", []),
    ("ð", "DJ", "Соль", "Ре и Соль", ["Равенство"]),
    ("â", "SK", "Ля", "Ми и Ля", []),
    ("ð", "SK", "Ля", "Ми и Ля", ["Равенство"]),
    ("Î", "SJ", "Фа высокое", "Фа высокое", []),
]


def melody(pitch):
    i = SCALE.index(LETTER[pitch])
    return "%s2%s2%s4" % (SCALE[i - 1], SCALE[i - 2], SCALE[i])


# --- glyphs in index.js ---
index_path = "src/res/index.js"
text = open(index_path, encoding="utf-8").read()
m = re.search(r"(export const STRELA_PROSTAYA = \[)(.*?)(\n\]\s*\n)", text, re.S)
if not m:
    raise SystemExit("STRELA_PROSTAYA block not found")
if '4","pitch"' in m.group(2) and "Подчашие" in m.group(2):
    print("index.js: already present")
else:
    entries = []
    for pometa, body, pitch, suffix, opts in VARIANTS:
        entries.append(
            '{"value":"<span class=\'red\'>%s</span>%s4","pitch":"%s","name":"%s%s","sounds":3,"opts":%s}'
            % (pometa, body, pitch, FAMILY, suffix,
               json.dumps(opts + ["Подчашие"], ensure_ascii=False, separators=(",", ":")))
        )
    new_block = m.group(2).rstrip() + ",\n" + ",\n".join(entries)
    text = text[: m.start(2)] + new_block + text[m.end(2):]
    open(index_path, "w", encoding="utf-8", newline="\n").write(text)
    print("index.js: added %d variants" % len(entries))

# --- notes ---
notes_path = "src/res/notesIndex.json"
idx = json.load(open(notes_path, encoding="utf-8"))
for pometa, body, pitch, suffix, opts in VARIANTS:
    # lookup for Равенство strips it and uses the target pitch, so key by pitch + Подчашие
    key = "%s%s|%s|Подчашие" % (FAMILY, suffix, pitch)
    idx[key] = melody(pitch)
    print(key, "=>", idx[key])
with open(notes_path, "w", encoding="utf-8") as f:
    json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))
