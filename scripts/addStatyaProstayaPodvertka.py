# -*- coding: utf-8 -*-
"""Add Статья простая + подвертка melodies: two quarters descending."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

PATH = "src/res/notesIndex.json"

# pitch → (upper letter, step-below letter) for X1Y1
PITCHES = [
    ("Фа малой", "Ф", "Е"),
    ("Ут низкое", "Г", "Ф"),
    ("Ре низкое", "Н", "Г"),
    ("Ми низкое", "ц", "Н"),
    ("Ут", "г", "ц"),
    ("Ре", "н", "г"),
    ("Ми", "с", "н"),
    ("Фа", "м", "с"),
    ("Соль", "п", "м"),
    ("Ля", "в", "п"),
    ("Фа высокое", "М", "в"),
    ("Соль высокое", "П", "М"),
    ("Ля высокое", "В", "П"),
]

idx = json.load(open(PATH, encoding="utf-8"))
added = []
updated = []


def put(key, notes):
    prev = idx.get(key)
    if prev == notes:
        return
    if prev is None or prev == "###":
        added.append((key, notes, prev))
    else:
        updated.append((key, notes, prev))
    idx[key] = notes


NAME = "Статья простая"
for pitch, y, x in PITCHES:
    # upper = pometa pitch (y), then step down (x) — «два звука вниз по 1/4»
    # Wait: «вниз» means first higher then lower. Pometa usually marks the
    # starting (upper) tone, then down: Y then X_below.
    # Scale letter for pitch is y; step below is x in our tuple as (pitch, Y, X_below).
    notes = "%s1%s1" % (y, x)
    # Actually I named them (pitch, y, x) where y=target/upper, x=step-below.
    # Melody down: upper first, then lower: y1 + x1
    notes = "%s1%s1" % (y, x)

    opt_sets = [
        "",
        "Подвертка",
        "Подвертка,Простая",
        "Простая,Подвертка",
        "Подвертка,Простая,Равенство",
        "Подвертка,Равенство,Простая",
        "Простая,Подвертка,Равенство",
        "Подвертка,Простая,Тихая",
        "Подвертка,Простая,Равенство,Тихая",
        "Подвертка,Простая,Тихая,Равенство",
    ]
    # makeNotesKey sorts opts — store only sorted forms
    seen = set()
    for opts in opt_sets:
        if opts:
            parts = opts.split(",")
            key_opts = ",".join(sorted(parts))
        else:
            key_opts = ""
        if key_opts in seen:
            continue
        seen.add(key_opts)
        if key_opts:
            put("%s|%s|%s" % (NAME, pitch, key_opts), notes)
        put("%s|%s" % (NAME, pitch), notes)
        put("%s|%s|" % (NAME, pitch), notes)

json.dump(idx, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("added", len(added), "updated", len(updated))
for k, notes, prev in added[:30]:
    print("+", k, "=>", notes)
for k, notes, prev in updated[:20]:
    print("~", k, ":", prev, "->", notes)
print("total", len(idx))
