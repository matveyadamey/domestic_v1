import { flatten } from 'lodash'
import { KRUKI, COMPOSITIONS } from '../res'
import notesIndex from '../res/notesIndex.json'
import { parseHightsForBravura } from './musicMap'

const allKruki = flatten(KRUKI.map(({ value }) => value))

/** Fix common HTML glitches in exported kruk glyph markup. */
export const normalizeKrukHtmlValue = (value) => {
  if (!value || typeof value !== 'string') return value
  return value
    .replace(/<span\s+<span/gi, '<span')
    .replace(/<span<span/gi, '<span')
}

const byValue = {}
allKruki.forEach((symbol) => {
  if (symbol && symbol.value) {
    byValue[symbol.value] = symbol
    const normalized = normalizeKrukHtmlValue(symbol.value)
    if (normalized && !byValue[normalized]) {
      byValue[normalized] = symbol
    }
  }
})

/** Pitch letter (after Cyrillic normalize) → pometa name */
const LETTER_TO_PITCH = {
  E: 'Ми малой',
  F: 'Фа малой',
  G: 'Ут низкое',
  N: 'Ре низкое',
  h: 'Ми низкое',
  g: 'Ут',
  n: 'Ре',
  s: 'Ми',
  m: 'Фа',
  p: 'Соль',
  v: 'Ля',
  M: 'Фа высокое',
  P: 'Соль высокое',
  V: 'Ля высокое',
}

const normalizePitchLetter = (ch) => {
  const map = {
    Е: 'E', Ф: 'F', Г: 'G', Н: 'N', ц: 'h', г: 'g', н: 'n', с: 's', м: 'm',
    п: 'p', в: 'v', М: 'M', П: 'P', В: 'V',
  }
  return map[ch] || ch
}

/** Last pitch letter in a notes string like "н1с1м2" → pometa name (e.g. "Фа") */
export const lastPitchFromNotes = (notesString) => {
  if (!notesString || typeof notesString !== 'string') return null
  const re = /([a-zA-Zа-яА-ЯЁё])/g
  let last = null
  let m
  while ((m = re.exec(notesString)) !== null) {
    const letter = normalizePitchLetter(m[1])
    if (LETTER_TO_PITCH[letter]) last = letter
  }
  return last ? LETTER_TO_PITCH[last] : null
}

/** Pitch "-" / empty = равенство without pometa. */
export const isEqualityPitch = (pitch) => (
  pitch === '-' || pitch === '' || pitch == null
)

export const isGolubchikName = (name) => (
  typeof name === 'string' && name.indexOf('Голубчик') === 0
)

/**
 * Голубчик with равенство / without pometa: upper note = pometa of the *next* kruk
 * (not the previous). Chains of such golubchiks must resolve right-to-left.
 */
export const usesForwardEquality = (name, pitch) => (
  isGolubchikName(name) && isEqualityPitch(pitch)
)

export const makeNotesKey = (name, pitch, opts) => {
  const optsPart = (opts || []).slice().sort().join(',')
  return `${name}|${pitch}|${optsPart}`
}

export const lookupNotesString = (name, pitch, opts) => {
  if (!name || !pitch) return null
  const exact = notesIndex[makeNotesKey(name, pitch, opts)]
  if (exact && exact !== '###') return exact
  const weak = notesIndex[`${name}|${pitch}`]
  if (weak && weak !== '###') return weak
  return null
}

const lookupWithEqualityOpts = (name, targetPitch, opts) => {
  const lookupOpts = (opts || []).filter(o => o !== 'Равенство')
  const found = lookupNotesString(name, targetPitch, lookupOpts)
  if (found) return found
  return lookupNotesString(name, targetPitch, [])
}

/**
 * Backward равенство: upper note = last note / pitch of the previous kruk.
 */
export const resolveEqualityNotes = ({ name, opts, prevNotes, prevPitch }) => {
  if (!name) return null
  const targetPitch = lastPitchFromNotes(prevNotes) || (
    prevPitch && prevPitch !== '-' ? prevPitch : null
  )
  if (!targetPitch) return null
  return lookupWithEqualityOpts(name, targetPitch, opts)
}

/**
 * Forward равенство (Голубчик): upper note = pometa of the next kruk.
 * If next is itself a resolved golubchik, use its upper (last) pitch.
 */
export const resolveForwardEqualityNotes = ({ name, opts, nextNotes, nextPitch }) => {
  if (!name) return null
  const targetPitch = (
    nextPitch && nextPitch !== '-' ? nextPitch : null
  ) || lastPitchFromNotes(nextNotes)
  if (!targetPitch) return null
  return lookupWithEqualityOpts(name, targetPitch, opts)
}

/** Effective pometa after resolving a kruk (explicit pitch, else last note). */
export const effectivePitchOf = (item, notesString) => {
  if (item && !isEqualityPitch(item.pitch)) return item.pitch
  return lastPitchFromNotes(notesString) || null
}

export const resolveNotesString = ({
  notes, value, name, pitch, opts, prevNotes, prevPitch, nextNotes, nextPitch, notesFixed,
}) => {
  // Popevka / face syllables: notes come from composition valueNotes (kruk2),
  // not from azbuka lookup — glyphs are тайнозамкнутые.
  if (notesFixed) {
    if (notes && notes !== '###') return notes
    return null
  }

  // Голубчик without pometa: upper = next kruk's pometa
  if (name && usesForwardEquality(name, pitch)) {
    const fromNext = resolveForwardEqualityNotes({ name, opts, nextNotes, nextPitch })
    if (fromNext) return fromNext
  }

  // Other equality without pometa: upper = last note of previous kruk
  if (name && isEqualityPitch(pitch) && !isGolubchikName(name)) {
    const fromEq = resolveEqualityNotes({ name, opts, prevNotes, prevPitch })
    if (fromEq) return fromEq
  }

  // Prefer live index lookup so mapping fixes apply even if syllable.notes is stale
  if (name && pitch && !isEqualityPitch(pitch)) {
    const fromMeta = lookupNotesString(name, pitch, opts)
    if (fromMeta) return fromMeta
  }
  const catalog = byValue[value] || byValue[normalizeKrukHtmlValue(value)]
  if (catalog) {
    if (usesForwardEquality(catalog.name, catalog.pitch)) {
      const fromNext = resolveForwardEqualityNotes({
        name: catalog.name,
        opts: catalog.opts,
        nextNotes,
        nextPitch,
      })
      if (fromNext) return fromNext
    } else if (isEqualityPitch(catalog.pitch) && !isGolubchikName(catalog.name)) {
      const fromEq = resolveEqualityNotes({
        name: catalog.name,
        opts: catalog.opts,
        prevNotes,
        prevPitch,
      })
      if (fromEq) return fromEq
    }
    if (!isEqualityPitch(catalog.pitch)) {
      const fromCatalog = lookupNotesString(catalog.name, catalog.pitch, catalog.opts)
      if (fromCatalog) return fromCatalog
    }
  }
  return notes || null
}

/**
 * Stamp тайнозамкнутые valueNotes onto matching COMPOSITIONS runs in a paragraph.
 * Mutates nothing — returns a shallow-copied paragraph array.
 */
export const applyCompositionNotesToParagraph = (paragraph) => {
  if (!Array.isArray(paragraph)) return paragraph

  const patterns = []
  COMPOSITIONS.forEach((group) => {
    (group.value || []).forEach((comp) => {
      if (!comp || !Array.isArray(comp.value) || !Array.isArray(comp.valueNotes)) return
      if (comp.value.length !== comp.valueNotes.length) return
      if (!comp.valueNotes.some(n => n && n !== '###')) return
      patterns.push(comp)
    })
  })
  patterns.sort((a, b) => b.value.length - a.value.length)

  const out = paragraph.slice()
  let i = 0
  while (i < out.length) {
    let matched = false
    for (let p = 0; p < patterns.length; p += 1) {
      const comp = patterns[p]
      const len = comp.value.length
      if (i + len > out.length) continue
      let ok = true
      for (let k = 0; k < len; k += 1) {
        const item = out[i + k]
        const raw = item && item.value ? String(item.value) : ''
        const itemVal = normalizeKrukHtmlValue(raw)
        if (!item || item.type !== 'KRUK' || itemVal !== comp.value[k]) {
          ok = false
          break
        }
      }
      if (!ok) continue
      for (let k = 0; k < len; k += 1) {
        const note = comp.valueNotes[k]
        if (!note || note === '###') continue
        // Don't override an already fixed non-empty melody
        if (out[i + k].notesFixed && out[i + k].notes) continue
        out[i + k] = {
          ...out[i + k],
          notes: note,
          notesFixed: true,
        }
      }
      i += len
      matched = true
      break
    }
    if (!matched) i += 1
  }
  return out
}

/**
 * Resolve notes for every KRUK in a paragraph.
 * Right-to-left first so Голубчик chains see the next kruk's pometa;
 * then left-to-right for backward равенство.
 * Returns map: paragraphIndex → notesString.
 */
export const resolveParagraphNotesMap = (paragraph) => {
  const result = {}
  if (!Array.isArray(paragraph)) return result

  const enriched = applyCompositionNotesToParagraph(paragraph)

  const indices = []
  enriched.forEach((item, index) => {
    if (item && item.type === 'KRUK') indices.push(index)
  })

  // Pass 1: right → left (forward equality + pitched lookups)
  let nextNotes = null
  let nextPitch = null
  for (let k = indices.length - 1; k >= 0; k -= 1) {
    const index = indices[k]
    const item = enriched[index]
    const notes = resolveNotesString({
      notes: item.notes,
      notesFixed: item.notesFixed,
      value: item.value,
      name: item.name,
      pitch: item.pitch,
      opts: item.opts,
      nextNotes,
      nextPitch,
      prevNotes: null,
      prevPitch: null,
    })
    if (notes) result[index] = notes

    if (notes) {
      nextNotes = notes
      nextPitch = effectivePitchOf(item, notes)
    } else if (!isEqualityPitch(item.pitch)) {
      nextPitch = item.pitch
      nextNotes = null
    }
    // else: leave next* unchanged — look through unresolved equality golubchik
  }

  // Pass 2: left → right (backward equality + refresh)
  let prevNotes = null
  let prevPitch = null
  for (let k = 0; k < indices.length; k += 1) {
    const index = indices[k]
    const item = enriched[index]
    const nextIndex = indices[k + 1]
    const nextItem = nextIndex != null ? enriched[nextIndex] : null
    const notes = resolveNotesString({
      notes: result[index] || item.notes,
      notesFixed: item.notesFixed,
      value: item.value,
      name: item.name,
      pitch: item.pitch,
      opts: item.opts,
      prevNotes,
      prevPitch,
      nextNotes: nextIndex != null ? (result[nextIndex] || null) : null,
      nextPitch: nextItem ? effectivePitchOf(nextItem, result[nextIndex]) : null,
    })
    if (notes) result[index] = notes

    if (notes) {
      prevNotes = notes
      prevPitch = effectivePitchOf(item, notes)
    } else if (!isEqualityPitch(item.pitch)) {
      prevPitch = item.pitch
    }
  }

  return result
}

export const resolveNotesData = (syllable) => {
  const notesString = resolveNotesString(syllable || {})
  return parseHightsForBravura(notesString)
}

export const enrichSyllableWithNotes = (syllable, prevSyllable, nextSyllable) => {
  if (!syllable || syllable.type !== 'KRUK') return syllable
  const prevNotes = prevSyllable
    ? resolveNotesString(prevSyllable)
    : syllable.prevNotes
  const prevPitch = prevSyllable
    ? effectivePitchOf(prevSyllable, prevNotes)
    : syllable.prevPitch
  const nextNotes = nextSyllable
    ? resolveNotesString({
      ...nextSyllable,
      // next of next unknown here; pitched next resolves via lookup
    })
    : syllable.nextNotes
  const nextPitch = nextSyllable
    ? effectivePitchOf(nextSyllable, nextNotes)
    : syllable.nextPitch
  const notes = resolveNotesString({
    ...syllable,
    prevNotes,
    prevPitch,
    nextNotes,
    nextPitch,
  })
  if (!notes) return syllable
  // Always refresh equality notes from context (stale pitch "-" must not stick)
  if (isEqualityPitch(syllable.pitch) || !syllable.notes) {
    return { ...syllable, notes }
  }
  return syllable
}

/** Last KRUK before `index` in a flat paragraph array. */
export const findPreviousKruk = (syllables, index) => {
  if (!Array.isArray(syllables) || index == null) return null
  for (let i = index - 1; i >= 0; i -= 1) {
    const s = syllables[i]
    if (s && s.type === 'KRUK') return s
  }
  return null
}

/** Last KRUK in the active paragraph of paper state. */
export const getLastKrukFromPaper = (paper) => {
  if (!paper || !paper.syllables) return null
  const page = paper.syllables[paper.currentPageNum]
  if (!Array.isArray(page)) return null
  const paragraph = page[paper.currentParagraphNum]
  if (!Array.isArray(paragraph) || paragraph.length === 0) return null
  for (let i = paragraph.length - 1; i >= 0; i -= 1) {
    if (paragraph[i] && paragraph[i].type === 'KRUK') return paragraph[i]
  }
  return null
}
