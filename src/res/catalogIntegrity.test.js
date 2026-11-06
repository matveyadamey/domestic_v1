import { KRUKI } from './index'
import knownIssues from './catalogKnownIssues.json'
import {
  lookupNotesString, resolveEqualityNotes, resolveForwardEqualityNotes,
  usesBackwardEquality, usesForwardEquality, isEqualityPitch,
} from '../utils/resolveNotes'
import { parseHightsForBravura } from '../utils/musicMap'

// Целостность каталога: каждое знамя из KRUKI должно находить ноты, и число нот
// должно совпадать с sounds. Старые нарушения перечислены в catalogKnownIssues.json:
// исправили знамя — уберите его оттуда; новое знамя должно проходить без записи в список.

const PITCHES = [
  'Ут низкое', 'Ре низкое', 'Ми низкое', 'Ут', 'Ре', 'Ми', 'Фа', 'Соль', 'Ля',
  'Фа высокое', 'Соль высокое', 'Ля высокое',
]

/** Ноты знамени как в resolveNotesString; для равенства перебираем соседние пометы. */
const resolveCatalogNotes = ({ name, pitch, opts }) => {
  const around = isEqualityPitch(pitch) ? PITCHES : [pitch]
  if (usesForwardEquality(name, pitch, opts)) {
    return around.map(p => resolveForwardEqualityNotes({ name, opts, nextPitch: p })).find(Boolean) || null
  }
  if (usesBackwardEquality(name, pitch, opts)) {
    const eq = around.map(p => resolveEqualityNotes({ name, opts, prevPitch: p })).find(Boolean)
    if (eq) return eq
  }
  return isEqualityPitch(pitch) ? null : lookupNotesString(name, pitch, opts)
}

const issueKey = (group, item) => (
  [group, item.name, item.pitch, (item.opts || []).join(','), item.value].join(' | ')
)

const rows = []
KRUKI.forEach(group => group.value.forEach((item) => {
  const notes = resolveCatalogNotes(item)
  rows.push({
    key: issueKey(group.label, item),
    item,
    notes,
    count: notes ? parseHightsForBravura(notes).length : 0,
  })
}))

const missingNotes = rows.filter(r => !r.notes)
const soundsMismatch = rows.filter(r => r.notes && Number(r.item.sounds) !== r.count)

describe('catalog integrity', () => {
  it('каждое знамя описано полностью', () => {
    const broken = rows
      .filter(({ item }) => (
        !item.value || !item.name || typeof item.pitch !== 'string'
        || !Array.isArray(item.opts) || !(Number(item.sounds) > 0)
      ))
      .map(r => r.key)
    expect(broken).toEqual([])
  })

  it('ноты разбираются нотным станом', () => {
    expect(rows.filter(r => r.notes && r.count === 0).map(r => `${r.key} => ${r.notes}`)).toEqual([])
  })

  it('у каждого знамени есть ноты', () => {
    const known = new Set(knownIssues.missingNotes)
    expect(missingNotes.filter(r => !known.has(r.key)).map(r => r.key)).toEqual([])
  })

  it('число нот совпадает с sounds', () => {
    const known = new Set(knownIssues.soundsMismatch)
    expect(soundsMismatch
      .filter(r => !known.has(r.key))
      .map(r => `${r.key} — sounds ${r.item.sounds}, нот ${r.count}: ${r.notes}`)).toEqual([])
  })

  it('список известных проблем не устарел', () => {
    const missing = new Set(missingNotes.map(r => r.key))
    const mismatched = new Set(soundsMismatch.map(r => r.key))
    expect(knownIssues.missingNotes.filter(k => !missing.has(k))).toEqual([])
    expect(knownIssues.soundsMismatch.filter(k => !mismatched.has(k))).toEqual([])
  })
})
