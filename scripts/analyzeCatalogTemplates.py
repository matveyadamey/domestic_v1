# -*- coding: utf-8 -*-
"""Вывести шаблоны мелодий каталога и найти знамёна, которые из них выбиваются.

Шаблон — мелодия в ступенях относительно пометы: «-1:2 -2:2 0:4» = ступень ниже
(половинная), две ниже (половинная), помета (целая).

Вход — выгрузка каталога с нотами, как их подставляет приложение (список объектов
{group, name, pitch, opts, value, sounds, notes}). Выход — markdown-отчёт.

    python scripts/analyzeCatalogTemplates.py catalog_dump.json report.md
"""
import json
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

SCALE = "ЕФГНцгнсмпвМПВ"
PITCH_LETTER = {
    "Ми малой": "Е", "Фа малой": "Ф", "Ут низкое": "Г", "Ре низкое": "Н",
    "Ми низкое": "ц", "Ут": "г", "Ре": "н", "Ми": "с", "Фа": "м", "Соль": "п",
    "Ля": "в", "Фа высокое": "М", "Соль высокое": "П", "Ля высокое": "В",
}
PITCH_ORDER = list(PITCH_LETTER)
FAMILY = {
    "Ут низкое": "Ут и Фа", "Ут": "Ут и Фа", "Фа": "Ут и Фа", "Фа высокое": "Ут и Фа",
    "Ре низкое": "Ре и Соль", "Ре": "Ре и Соль", "Соль": "Ре и Соль", "Соль высокое": "Ре и Соль",
    "Ми низкое": "Ми и Ля", "Ми": "Ми и Ля", "Ля": "Ми и Ля", "Ля высокое": "Ми и Ля",
    "Ми малой": "Ми и Ля", "Фа малой": "Ут и Фа",
}
NOTE_RE = re.compile(r"([ЕФГНцгнсмпвМПВ])([#bn])?(!|[1-6])")
RED_RE = re.compile(r"<span class='red[^']*'>(.*?)</span>")
SUFFIX_RE = [
    re.compile(r"\s+(Ут и Фа|Ре и Соль|Ми и Ля)$"),
    re.compile(r"\s+(с равенством|равенство|Равенство)$"),
    re.compile(r"\s+(Ут|Ре|Ми|Фа|Соль|Ля)(\s+(низкое|высокое))?$"),
]


def base_name(name):
    prev = None
    name = name.strip()
    while prev != name:
        prev = name
        for r in SUFFIX_RE:
            name = r.sub("", name).strip()
    return name


def template(notes, pitch):
    """'с2н2м4' при помете Фа → '-1:2 -2:2 0:4'."""
    origin = SCALE.index(PITCH_LETTER[pitch])
    parts = []
    for letter, acc, dur in NOTE_RE.findall(notes):
        parts.append("%+d%s:%s" % (SCALE.index(letter) - origin, acc or "", dur))
    return " ".join(p.replace("+0", "0") for p in parts)


def body_of(value):
    return RED_RE.sub("", value).strip()


def pitch_key(pitch):
    return PITCH_ORDER.index(pitch) if pitch in PITCH_ORDER else 99


def main(dump_path, report_path):
    items = json.load(open(dump_path, encoding="utf-8"))

    exceptions = defaultdict(list)  # причина → записи
    groups = defaultdict(list)
    for it in items:
        opts = it.get("opts") or []
        if it["pitch"] in ("-", ""):
            exceptions["Без пометы (равенство к соседу / в попевке)"].append(it)
            continue
        if it["pitch"] not in PITCH_LETTER:
            exceptions["Нестандартная помета («с доп. пометой» и т.п.)"].append(it)
            continue
        if not it.get("notes"):
            exceptions["Нот нет"].append(it)
            continue
        eq = "Равенство" in opts
        key_opts = tuple(sorted(o for o in opts if o != "Равенство"))
        it["template"] = template(it["notes"], it["pitch"])
        groups[(it["group"], base_name(it["name"]), key_opts, eq)].append(it)

    consistent, outliers, conflicts, singles = [], [], [], []
    for key, rows in groups.items():
        by_pitch = defaultdict(set)
        for r in rows:
            by_pitch[r["pitch"]].add(r["template"])
        counts = Counter(t for ts in by_pitch.values() for t in ts)
        if len(by_pitch) == 1:
            singles.append((key, rows, counts))
        elif len(counts) == 1:
            consistent.append((key, rows, counts))
        else:
            (top, n_top), = counts.most_common(1)
            ties = [t for t, n in counts.items() if n == n_top]
            if len(ties) > 1 or n_top * 2 <= len(by_pitch):
                conflicts.append((key, rows, counts))
            else:
                outliers.append((key, rows, top))

    # Равенство-группы, у которых шаблон не совпадает с основной группой
    eq_mismatch = []
    for (group, name, opts, eq), rows in groups.items():
        if not eq:
            continue
        base = groups.get((group, name, opts, False))
        if not base:
            continue
        base_t = Counter(r["template"] for r in base).most_common(1)[0][0]
        bad = [r for r in rows if r["template"] != base_t]
        if bad:
            eq_mismatch.append(((group, name, opts), base_t, bad))

    templated_items = sum(len(r) for _, r, _ in consistent) + sum(len(r) for _, r, _ in outliers)
    template_records = len(consistent) + len(outliers)

    out = []
    w = out.append
    w("# Анализ шаблонов каталога\n")
    w("Шаблон — мелодия в ступенях от пометы: `-1:2 -2:2 0:4` = ступень ниже (1/2), две ниже (1/2), помета (1).\n")
    w("Группа — знамя (имя без пометы и семейства «Ут и Фа»…) + набор опций; варианты с равенством — отдельно.\n")
    w("## Итог\n")
    w("| | групп | знамён |")
    w("|---|---:|---:|")
    w("| Всего в каталоге | | %d |" % len(items))
    w("| Один шаблон на всех пометах | %d | %d |" % (len(consistent), sum(len(r) for _, r, _ in consistent)))
    w("| Шаблон есть, но отдельные пометы выбиваются | %d | %d |" % (len(outliers), sum(len(r) for _, r, _ in outliers)))
    w("| Шаблона нет: пометы расходятся без большинства | %d | %d |" % (len(conflicts), sum(len(r) for _, r, _ in conflicts)))
    w("| Знамя только на одной помете (не проверить) | %d | %d |" % (len(singles), sum(len(r) for _, r, _ in singles)))
    for reason, rows in exceptions.items():
        w("| %s | | %d |" % (reason, len(rows)))
    w("")
    w("Если перейти на шаблоны, **%d знамён** описываются **%d записями**.\n" % (templated_items, template_records))

    w("## Выбиваются из шаблона (вероятные ошибки)\n")
    w("Шаблон большинства помет и пометы, где мелодия другая.\n")
    for (group, name, opts, eq), rows, top in sorted(outliers, key=lambda x: (x[0][0], x[0][1])):
        w("### %s — %s%s%s" % (group, name, " · " + ", ".join(opts) if opts else "", " · равенство" if eq else ""))
        w("Шаблон: `%s`\n" % top)
        seen = set()
        for r in sorted(rows, key=lambda r: pitch_key(r["pitch"])):
            if r["template"] == top or (r["pitch"], r["notes"]) in seen:
                continue
            seen.add((r["pitch"], r["notes"]))
            w("- %s: `%s` (`%s`), начертание `%s` — «%s»" % (
                r["pitch"], r["notes"], r["template"], body_of(r["value"]), r["name"]))
        w("")

    w("## Шаблона нет: пометы расходятся\n")
    for (group, name, opts, eq), rows, counts in sorted(conflicts, key=lambda x: (x[0][0], x[0][1])):
        w("### %s — %s%s%s" % (group, name, " · " + ", ".join(opts) if opts else "", " · равенство" if eq else ""))
        seen = set()
        for r in sorted(rows, key=lambda r: pitch_key(r["pitch"])):
            if (r["pitch"], r["notes"]) in seen:
                continue
            seen.add((r["pitch"], r["notes"]))
            w("- %s: `%s` (`%s`)" % (r["pitch"], r["notes"], r["template"]))
        w("")

    w("## Равенство даёт не тот шаблон, что без равенства\n")
    for (group, name, opts), base_t, bad in eq_mismatch:
        w("- %s — %s%s: без равенства `%s`, с равенством %s" % (
            group, name, " · " + ", ".join(opts) if opts else "", base_t,
            ", ".join("%s `%s`" % (r["pitch"], r["template"]) for r in bad)))
    w("")

    w("## Начертание по помете\n")
    w("Можно ли выбирать тело знамени (без красных помет) по семейству пометы (Ут и Фа / Ре и Соль / Ми и Ля) или хотя бы по самой помете.\n")
    body_stat = Counter()
    for rows in groups.values():
        if len({r["pitch"] for r in rows}) < 2:
            continue
        per_pitch, per_family = defaultdict(set), defaultdict(set)
        for r in rows:
            per_pitch[r["pitch"]].add(body_of(r["value"]))
            per_family[FAMILY[r["pitch"]]].add(body_of(r["value"]))
        if all(len(v) == 1 for v in per_family.values()):
            body_stat["одно начертание на семейство пометы"] += 1
        elif all(len(v) == 1 for v in per_pitch.values()):
            body_stat["одно начертание на помету (семейства не хватает)"] += 1
        else:
            body_stat["несколько начертаний на одной помете"] += 1
    for k, c in body_stat.most_common():
        w("- %s: %d групп" % (k, c))
    w("")

    w("## Исключения\n")
    for reason, rows in exceptions.items():
        w("### %s (%d)" % (reason, len(rows)))
        for r in rows:
            w("- %s — %s · %s · %s" % (r["group"], r["name"], r["pitch"] or "—", ", ".join(r.get("opts") or []) or "без опций"))
        w("")

    open(report_path, "w", encoding="utf-8", newline="\n").write("\n".join(out))
    print("групп: один шаблон %d, выбиваются %d, конфликт %d, одна помета %d; исключений %d" % (
        len(consistent), len(outliers), len(conflicts), len(singles), sum(len(r) for r in exceptions.values())))
    print("шаблонами описываются %d знамён в %d записях" % (templated_items, template_records))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
