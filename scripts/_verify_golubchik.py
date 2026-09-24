# -*- coding: utf-8 -*-
import re
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
text = open("src/res/index.js", encoding="utf-8").read()
pattern = re.compile(
    r'\{"value":"(?P<value>(?:\\.|[^"\\])*)","pitch":"(?P<pitch>[^"]*)","name":"(?P<name>[^"]*)","sounds":(?P<sounds>[^,]+),"opts":(?P<opts>\[[^\]]*\])\}'
)
idx = json.load(open("src/res/notesIndex.json", encoding="utf-8"))

print("=== Голубчик status ===")
for m in pattern.finditer(text):
    name = m.group("name")
    if "Голубчик" not in name:
        continue
    pitch = m.group("pitch")
    opts = re.findall(r'"([^"]+)"', m.group("opts"))
    key_exact = "%s|%s|%s" % (name, pitch, ",".join(sorted(opts)))
    key_weak = "%s|%s" % (name, pitch)
    notes = idx.get(key_exact) or idx.get(key_weak)
    status = "OK" if notes and notes != "###" else ("EQ(-)" if pitch == "-" else "MISSING")
    print("[%s] %s | pitch=%r opts=%s => %s" % (status, name, pitch, opts, notes))
