# -*- coding: utf-8 -*-
"""Add Скамейца + Борзая glyphs and notes (same pitches, half durations)."""
import json
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

# pitch letter in red span (as used in existing SKAMEITCA)
VARIANTS = [
    # (pometa_char, pitch, name, black_body_without_stones_base)
    ("Í", "Ре низкое", "Скамейца Ре и Соль", r"L\\7"),
    ("Ö", "Ми низкое", "Скамейца Ми и Ля", "<7"),
    ("ã", "Ут", "Скамейца Ут и Фа", "L7"),
    ("í", "Ре", "Скамейца Ре и Соль", r"L\\7"),
    ("ö", "Ми", "Скамейца Ми и Ля", "<7"),
    ("ì", "Фа", "Скамейца Ут и Фа", "L7"),
    ("ï", "Соль", "Скамейца Ре и Соль", r"L\\7"),
    ("â", "Ля", "Скамейца Ми и Ля", "<7"),
    # high: same body as mid + one stone (7); height comes from pometa only
    # (glyph '>' stacks extra marks — do not use for борзая)
    ("Î", "Фа высокое", "Скамейца Фа высокое", "L7"),
    ("Ï", "Соль высокое", "Скамейца Соль высокое", r"L\\7"),
    ("Â", "Ля высокое", "Скамейца Ля высокое", "<7"),
]

# Ordinary melody with durations halved: 1 → !
NOTES = {
    "Ре низкое": "Г!Н!",
    "Ми низкое": "Н!ц!",
    "Ут": "ц!г!",
    "Ре": "г!н!",
    "Ми": "н!с!",
    "Фа": "с!м!",
    "Соль": "м!п!",
    "Ля": "п!в!",
    "Фа высокое": "в!М!",
    "Соль высокое": "М!П!",
    "Ля высокое": "П!В!",
}

# --- glyphs in index.js ---
index_path = "src/res/index.js"
text = open(index_path, encoding="utf-8").read()

entries = []
for pometa, pitch, name, body in VARIANTS:
    value = "<span class='red'>%sá</span>%s" % (pometa, body)
    entries.append(
        '{"value":"%s","pitch":"%s","name":"%s","sounds":2,"opts":["Борзая"]}'
        % (value, pitch, name)
    )

insert = ",".join(entries)

m = re.search(r"(export const SKAMEITCA = \[)(.*?)(\]\s*\n\s*export const DERBICA)", text, re.S)
if not m:
    raise SystemExit("SKAMEITCA block not found")

block = m.group(2).rstrip()
if block.endswith(","):
    new_block = block + insert
else:
    # block is {...},{...} without trailing comma after last
    new_block = block.rstrip() + "," + insert

# avoid double-insert
if 'opts":["Борзая"]' in m.group(2) and "Скамейца" in m.group(2):
    # check if our specific pattern already there
    if "L\\\\99" in m.group(2) or "L\\9" in m.group(2) or "<9" in m.group(2):
        print("glyphs already present, skipping insert")
        new_text = text
    else:
        new_text = text[: m.start(2)] + new_block + text[m.end(2) :]
else:
    new_text = text[: m.start(2)] + new_block + text[m.end(2) :]

if new_text != text:
    open(index_path, "w", encoding="utf-8", newline="\n").write(new_text)
    print("added %d glyph variants to SKAMEITCA" % len(entries))
else:
    print("index.js unchanged")

# --- notes ---
notes_path = "src/res/notesIndex.json"
idx = json.load(open(notes_path, encoding="utf-8"))
added = []
for pometa, pitch, name, body in VARIANTS:
    notes = NOTES[pitch]
    keys = [
        "%s|%s|Борзая" % (name, pitch),
        "%s|%s|Борзая" % (name, pitch),  # exact
    ]
    # also short name aliases used elsewhere
    for key in [
        "%s|%s|Борзая" % (name, pitch),
    ]:
        prev = idx.get(key)
        if prev != notes:
            idx[key] = notes
            added.append("%s => %s (was %r)" % (key, notes, prev))

# equality-named aliases that share same pitch melodies
ALIASES = [
    ("Скамейца Ут равенство", "Ут"),
    ("Скамейца Ре равенство", "Ре"),
    ("Скамейца Ми равенство", "Ми"),
    ("Скамейца Фа равенство", "Фа"),
    ("Скамейца Соль равенство", "Соль"),
    ("Скамейца Ля", "Ля"),
    ("Скамейца Фа высокое равенство", "Фа высокое"),
    ("Скамейца Соль высокое равенство", "Соль высокое"),
]
for name, pitch in ALIASES:
    notes = NOTES[pitch]
    key = "%s|%s|Борзая" % (name, pitch)
    prev = idx.get(key)
    if prev != notes:
        idx[key] = notes
        added.append("%s => %s (was %r)" % (key, notes, prev))

with open(notes_path, "w", encoding="utf-8") as f:
    json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))

print("notes keys added/updated: %d" % len(added))
for line in added:
    print(line)
