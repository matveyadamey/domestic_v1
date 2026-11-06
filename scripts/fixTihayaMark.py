# -*- coding: utf-8 -*-
"""Тихая помета — горизонтальная палочка «+», а не «-» (переводка, скамейца); у голубчика тихого палочки нет."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

PATH = "src/res/index.js"
text = open(PATH, encoding="utf-8").read()
fixed = 0


def fix(match):
    global fixed
    entry = match.group(0)
    if '"Тихая"' not in entry:
        return entry
    new = re.sub(r"(<span class='red[^']*'>[^<]*)-(</span>)", r"\1+\2", entry)
    if new != entry:
        fixed += 1
    return new


text = re.sub(r"\{\"value\":\"[^{}]*\}", fix, text)
open(PATH, "w", encoding="utf-8", newline="\n").write(text)
print("тихая «-» → «+»: %d знамён" % fixed)

# то же в попевке (мережа: скамейца с тихой и задержкой)
text = open(PATH, encoding="utf-8").read()
text = text.replace("<span class='red'>-</span>L92", "<span class='red'>+</span>L92")
open(PATH, "w", encoding="utf-8", newline="\n").write(text)

# с нижней пометой (ù, ú…) палочка, стоящая после помет, перечёркивает её — ставим палочку первой
LOWER = "ùú÷ûüÿýþøĀ"
text = open(PATH, encoding="utf-8").read()
moved = 0


def move_first(match):
    global moved
    head, marks, tail = match.group(1), match.group(2), match.group(3)
    if not any(ch in LOWER for ch in marks):
        return match.group(0)
    moved += 1
    return "%s+%s%s" % (head, marks, tail)


# только переводка (P): у стрел с доп. пометой палочка стоит верно
text = re.sub(r"(<span class='red[^']*'>)([^<+]+)\+(</span>P)", move_first, text)
open(PATH, "w", encoding="utf-8", newline="\n").write(text)
print("палочка перед нижней пометой: %d знамён" % moved)
