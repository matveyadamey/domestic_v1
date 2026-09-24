# -*- coding: utf-8 -*-
"""Add missing Голубчик notes, including равенство (pitch '-') aliases."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

INDEX = "src/res/notesIndex.json"
idx = json.load(open(INDEX, encoding="utf-8"))

# Upper note (= pitch) → notes for борзый (quarters) and тихий (halves)
# Pattern: step below + pitch (равенство: upper matches previous last note)
BORZIY = {
    "Ми низкое": "Н1ц1",
    "Ут": "ц1г1",
    "Ре": "г1н1",
    "Ми": "н1с1",
    "Фа": "с1м1",
    "Соль": "м1п1",
    "Ля": "п1в1",
    "Фа высокое": "в1М1",
    "Соль высокое": "М1П1",
}

TIHIY = {
    "Ми низкое": "Н2ц2",
    "Ут": "ц2г2",
    "Ре": "г2н2",
    "Ми": "н2с2",
    "Фа": "с2м2",
    "Соль": "м2п2",
    "Ля": "п2в2",
    "Фа высокое": "в2М2",
    "Соль высокое": "М2П2",
}

# Ломка: skip immediate neighbor (2 steps below → pitch)
BORZIY_LOMKA = {
    "Ми низкое": "G1ц1",
    "Ут": "Н1г1",
    "Ре": "ц1н1",
    "Ми": "г1с1",
    "Фа": "н1м1",
    "Соль": "с1п1",
    "Ля": "м1в1",
    "Фа высокое": "п1М1",
    "Соль высокое": "в1П1",
}

added = []


def put(key, notes):
    if idx.get(key) in (None, "", "###"):
        idx[key] = notes
        added.append("%s => %s" % (key, notes))
    elif key not in idx:
        idx[key] = notes
        added.append("%s => %s" % (key, notes))


for pitch, notes in BORZIY.items():
    put("Голубчик борзый|%s" % pitch, notes)
    put("Голубчик борзый|%s|" % pitch, notes)
    put("Голубчик борзый|%s|Равенство" % pitch, notes)
    # Local catalog uses empty opts; API used Борзый
    put("Голубчик борзый|%s|Борзый" % pitch, notes)

for pitch, notes in TIHIY.items():
    put("Голубчик тихий|%s" % pitch, notes)
    put("Голубчик тихий|%s|" % pitch, notes)
    put("Голубчик тихий|%s|Равенство" % pitch, notes)
    put("Голубчик тихий|%s|Тихий" % pitch, notes)
    put("Голубчик тихий|%s|Тихая,Тихий" % pitch, notes)

for pitch, notes in BORZIY_LOMKA.items():
    put("Голубчик борзый|%s|Ломка" % pitch, notes)
    put("Голубчик борзый|%s|Борзый,Ломка" % pitch, notes)
    put("Голубчик борзый|%s|Ломка,Равенство" % pitch, notes)

# pitch '-' = равенство without explicit pometa: store under Равенство opt
# Actual pitch comes from previous kruk at runtime; keep duration-only markers
# removed — runtime fills real notes. Still register weak keys pointing to
# a sentinel is useless. Instead leave '-' to runtime and ensure listMissing
# can treat them as context-dependent.

with open(INDEX, "w", encoding="utf-8") as f:
    json.dump(idx, f, ensure_ascii=False, separators=(",", ":"))

print("added/updated %d keys" % len(added))
for line in added:
    print(line)
