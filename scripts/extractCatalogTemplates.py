# -*- coding: utf-8 -*-
"""Собрать src/res/catalogTemplates.json из текущего каталога.

Одна запись — знамя с набором опций: мелодия-шаблон в ступенях от пометы и
варианты по пометам (начертание). Вариант хранит name/opts, только если они
отличаются от записи, и notes — только если мелодия не совпадает с шаблоном
(или шаблона нет: помета «-», «с доп. пометой»). Так генератор восстанавливает
каталог без потерь, а явные notes — это список мест, которые стоит проверить.

    python scripts/extractCatalogTemplates.py catalog_dump.json src/res/catalogTemplates.json

catalog_dump.json — каталог с нотами, как их подставляет приложение
(см. analyzeCatalogTemplates.py).
"""
import json
import os
import sys
from collections import Counter, OrderedDict

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyzeCatalogTemplates import FAMILY, PITCH_LETTER, base_name, template  # noqa: E402


def expand_name(pattern, pitch):
    """«Крюк {pitch}» / «Стрела мрачная {family}» → имя для пометы (как в генераторе)."""
    return pattern.replace("{pitch}", pitch).replace("{family}", FAMILY.get(pitch, pitch))


def name_pattern(rows):
    """Шаблон имени, подходящий большинству вариантов; остальные хранят name явно."""
    base = base_name(rows[0]["name"])
    candidates = ["%s {pitch}" % base, "%s {family}" % base]
    candidates += [n for n, _ in Counter(r["name"] for r in rows).most_common()]
    return max(candidates, key=lambda p: sum(expand_name(p, r["pitch"]) == r["name"] for r in rows))


def melody_of(item):
    if item["pitch"] not in PITCH_LETTER or not item.get("notes"):
        return None
    return template(item["notes"], item["pitch"])


def main(dump_path, out_path):
    items = json.load(open(dump_path, encoding="utf-8"))

    groups = OrderedDict()
    for it in items:
        g = groups.setdefault(it["groupId"], {"id": it["groupId"], "label": it["group"], "records": OrderedDict()})
        opts = it.get("opts") or []
        key = (base_name(it["name"]), tuple(sorted(opts)))
        g["records"].setdefault(key, []).append(it)

    out_groups = []
    explicit = 0
    records_total = 0
    for g in groups.values():
        records = []
        for rows in g["records"].values():
            name = name_pattern(rows)
            opts = list(Counter(tuple(r.get("opts") or []) for r in rows).most_common(1)[0][0])
            melodies = Counter(m for m in (melody_of(r) for r in rows) if m)
            melody = melodies.most_common(1)[0][0] if melodies else None
            variants = []
            for r in rows:
                v = OrderedDict([("pitch", r["pitch"]), ("value", r["value"])])
                if expand_name(name, r["pitch"]) != r["name"]:
                    v["name"] = r["name"]
                if list(r.get("opts") or []) != opts:
                    v["opts"] = list(r.get("opts") or [])
                if melody is None or melody_of(r) != melody:
                    v["notes"] = r.get("notes")
                    explicit += 1
                    if not r.get("notes"):
                        v["sounds"] = int(r["sounds"])
                variants.append(v)
            rec = OrderedDict([("name", name), ("opts", opts)])
            if melody:
                rec["melody"] = melody
            rec["variants"] = variants
            records.append(rec)
        records_total += len(records)
        out_groups.append({"id": g["id"], "label": g["label"], "records": records})

    # Компактный вывод: запись на строке-заголовке, вариант — строка
    lines = ["{", '"groups": [']
    for gi, g in enumerate(out_groups):
        lines.append('{"id": %d, "label": %s, "records": [' % (g["id"], json.dumps(g["label"], ensure_ascii=False)))
        for ri, rec in enumerate(g["records"]):
            head = OrderedDict((k, rec[k]) for k in rec if k != "variants")
            lines.append("  " + json.dumps(head, ensure_ascii=False)[:-1] + ', "variants": [')
            for vi, v in enumerate(rec["variants"]):
                lines.append("    " + json.dumps(v, ensure_ascii=False) + ("," if vi < len(rec["variants"]) - 1 else ""))
            lines.append("  ]}" + ("," if ri < len(g["records"]) - 1 else ""))
        lines.append("]}" + ("," if gi < len(out_groups) - 1 else ""))
    lines.append("]", )
    lines.append("}")
    open(out_path, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

    print("знамён %d → записей %d, явных нот у вариантов %d" % (len(items), records_total, explicit))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
