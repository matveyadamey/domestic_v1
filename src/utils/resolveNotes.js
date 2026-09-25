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

/**
 * Ascending diatonic order of pometas used in the azbuka / notesIndex.
 * Голубчик без пометы looks up the step *below* the following kruk.
 */
const PITCH_ASCENDING = [
  'Ми малой',
  'Фа малой',
  'Ут низкое',
  'Ре низкое',
  'Ми низкое',
  'Ут',
  'Ре',
  'Ми',
  'Фа',
  'Соль',
  'Ля',
  'Фа высокое',
  'Соль высокое',
  'Ля высокое',
]

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

/** Pometa one diatonic step below (or null at the bottom of the list). */
export const pitchBelow = (pitch) => {
  if (!pitch || pitch === '-') return null
  const i = PITCH_ASCENDING.indexOf(pitch)
  if (i <= 0) return null
  return PITCH_ASCENDING[i - 1]
}

/** Pitch "-" / empty = равенство without pometa. */
export const isEqualityPitch = (pitch) => (
  pitch === '-' || pitch === '' || pitch == null
)

export const isGolubchikName = (name) => (
  typeof name === 'string' && name.indexOf('Голубчик') === 0
)

export const hasRavenstvoOpt = (opts) => (
  Array.isArray(opts) && opts.indexOf('Равенство') !== -1
)

/**
 * Голубчик без пометы (pitch «-», без опции «Равенство»): фигура к следующему
 * крюку, ступенью ниже его пометы (перед Фа → ре–ми).
 */
export const usesForwardEquality = (name, pitch, opts) => (
  isGolubchikName(name) && isEqualityPitch(pitch) && !hasRavenstvoOpt(opts)
)

/**
 * Голубчик с равенством: подходит к помете / последней ноте *предыдущего* крюка.
 */
export const usesGolubchikBackwardEquality = (name, pitch, opts) => (
  isGolubchikName(name) && isEqualityPitch(pitch) && hasRavenstvoOpt(opts)
)

export const isZmiycaName = (name) => (
  typeof name === 'string' && name.indexOf('Змийца') === 0
)

/** Suffix families shared by many azbuka names (Малая/Средняя закрытая, стрелы…). */
const familySuffixForPitch = (pitch) => {
  switch (pitch) {
    case 'Ут низкое':
    case 'Ут':
    case 'Фа':
    case 'Фа высокое':
      return ' Ут и Фа'
    case 'Ре низкое':
    case 'Ре':
    case 'Соль':
    case 'Соль высокое':
      return ' Ре и Соль'
    case 'Ми низкое':
    case 'Ми':
    case 'Ля':
    case 'Ля высокое':
      return ' Ми и Ля'
    default:
      return null
  }
}

/**
 * Азбучное семейство Змийцы по помете (верхняя = 2-я нота фигуры).
 * Соль/Соль высокое в индексе лежат на «Змийца Ре».
 */
export const zmiycaNameForPitch = (pitch) => {
  switch (pitch) {
    case 'Ут низкое':
    case 'Ут':
    case 'Фа':
    case 'Фа высокое':
      return 'Змийца Ут и Фа'
    case 'Ре низкое':
    case 'Ре':
    case 'Соль':
    case 'Соль высокое':
      return 'Змийца Ре'
    case 'Ми низкое':
    case 'Ми':
    case 'Ля':
    case 'Ля высокое':
      return 'Змийца Ми и Ля'
    default:
      return null
  }
}

/**
 * Remap azbuka name so lookup uses the previous pometa's family.
 * Змийца has irregular «Ре»/«Соль»; others swap Ут и Фа / Ре и Соль / Ми и Ля.
 */
export const equalityNameForPitch = (name, targetPitch) => {
  if (!name || !targetPitch) return name
  if (isZmiycaName(name)) return zmiycaNameForPitch(targetPitch) || name
  const fam = familySuffixForPitch(targetPitch)
  if (!fam) return name
  const swapped = name.replace(/ Ут и Фа$| Ре и Соль$| Ми и Ля$/, fam)
  return swapped !== name ? swapped : name
}

/**
 * Любой крюк с «Равенство» — к предыдущему; также pitch «-» (кроме голубчика без пометы).
 */
export const usesBackwardEquality = (name, pitch, opts) => {
  if (usesForwardEquality(name, pitch, opts)) return false
  if (hasRavenstvoOpt(opts)) return true
  return isEqualityPitch(pitch) && !isGolubchikName(name)
}

/** @deprecated use usesBackwardEquality — kept for call sites/tests */
export const usesZmiycaBackwardEquality = (name, opts) => (
  isZmiycaName(name) && hasRavenstvoOpt(opts)
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
 * Имя семейства (Змийца / Ут и Фа / …) подбирается по целевой помете.
 */
export const resolveEqualityNotes = ({ name, opts, prevNotes, prevPitch }) => {
  if (!name) return null
  const targetPitch = lastPitchFromNotes(prevNotes) || (
    prevPitch && prevPitch !== '-' ? prevPitch : null
  )
  if (!targetPitch) return null
  const lookupName = equalityNameForPitch(name, targetPitch)
  const found = lookupWithEqualityOpts(lookupName, targetPitch, opts)
  if (found) return found
  if (lookupName !== name) return lookupWithEqualityOpts(name, targetPitch, opts)
  return null
}

/**
 * Forward равенство (Голубчик): look up as if pometa were one step below
 * the next kruk (before Фа → Голубчик|Ми → н1с1 «ре ми»).
 * If next is itself a resolved golubchik, step below its upper (last) pitch.
 */
export const resolveForwardEqualityNotes = ({ name, opts, nextNotes, nextPitch }) => {
  if (!name) return null
  const following = (
    nextPitch && nextPitch !== '-' ? nextPitch : null
  ) || lastPitchFromNotes(nextNotes)
  const targetPitch = pitchBelow(following)
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

  // Голубчик без пометы: на ступень ниже следующего крюка
  if (name && usesForwardEquality(name, pitch, opts)) {
    const fromNext = resolveForwardEqualityNotes({ name, opts, nextNotes, nextPitch })
    if (fromNext) return fromNext
  }

  // Равенство / pitch «-»: верхняя = помета (или последняя нота) предыдущего крюка
  if (name && usesBackwardEquality(name, pitch, opts)) {
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
    if (usesForwardEquality(catalog.name, catalog.pitch, catalog.opts)) {
      const fromNext = resolveForwardEqualityNotes({
        name: catalog.name,
        opts: catalog.opts,
        nextNotes,
        nextPitch,
      })
      if (fromNext) return fromNext
    } else if (usesBackwardEquality(catalog.name, catalog.pitch, catalog.opts)) {
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
 * Right-to-left first so Голубчик без пометы sees the next kruk;
 * then left-to-right for backward равенство (включая Голубчик с равенством).
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
  // Always refresh equality notes from context (stale pitch "-" / Равенство must not stick)
  if (
    isEqualityPitch(syllable.pitch)
    || hasRavenstvoOpt(syllable.opts)
    || !syllable.notes
  ) {
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
