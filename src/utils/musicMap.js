export const SMUFL = {
  eighthUp: '\uE1D7',
  quarterUp: '\uE1D5',
  halfUp: '\uE1D3',
  whole: '\uE1D2',
  dot: '\uE1E7',
  flat: '\uE260',
  sharp: '\uE262',
  ledger: '\uE022',
  clef: '\uE050',
  eighthDown: '\uE1D8',
  quarterDown: '\uE1D6',
  halfDown: '\uE1D4',
}

/**
 * Offsets for standard treble clef (bottom line = E/Ми = 0).
 * kruk2 stores pitches with Ут on the bottom line; we shift by -2 so
 * Ми→line 1, Соль→line 2 (G clef line).
 */
export const PITCH_CONFIG = {
  E: { offset: -7 }, // ми малой октавы (E3)
  F: { offset: -6 }, // фа малой октавы (F3)
  G: { offset: -5 }, // соль малой / Ут низкое (G3)
  N: { offset: -4 }, // ля малой / Ре низкое (A3)
  h: { offset: -3 }, // си малой / Ми низкое (B3)
  g: { offset: -2 }, // Ут (C4)
  n: { offset: -1 }, // Ре
  s: { offset: 0 }, // Ми (bottom line)
  m: { offset: 1 }, // Фа (первая)
  p: { offset: 2 }, // Соль (G line, первая)
  v: { offset: 3.2 }, // Ля
  M: { offset: 4.2 },
  P: { offset: 5.3 },
  V: { offset: 6.4 },
}

const getLedgerLines = (offset) => {
  const lines = []
  const val = Math.floor(offset)
  // Below the staff (bottom line = 0)
  if (val <= -2) {
    for (let p = -2; p >= val; p -= 2) {
      lines.push(p)
    }
  }
  // Above the staff (top line = 8)
  if (val >= 10) {
    for (let p = 10; p <= val; p += 2) {
      lines.push(p)
    }
  }
  return lines
}

/**
 * Parse kruk2 melodic transcription (e.g. "н1с1м2") into Bravura note descriptors.
 * Duration: ! = eighth, 1 = quarter, 2 = half, 3 = dotted half, 4 = whole, 5 = dotted quarter.
 */
export const parseHightsForBravura = (hightsString) => {
  if (!hightsString || typeof hightsString !== 'string') return []

  const normalized = hightsString
    .replace(/Е/g, 'E').replace(/Ф/g, 'F')
    .replace(/Г/g, 'G').replace(/Н/g, 'N').replace(/ц/g, 'h')
    .replace(/г/g, 'g').replace(/н/g, 'n').replace(/с/g, 's').replace(/м/g, 'm')
    .replace(/п/g, 'p').replace(/в/g, 'v').replace(/М/g, 'M').replace(/П/g, 'P').replace(/В/g, 'V')

  const matches = []
  const re = /([a-zA-Z])([#bn])?(!|[1-6])/g
  let m
  while ((m = re.exec(normalized)) !== null) {
    matches.push(m)
  }

  return matches.map((match) => {
    const pChar = match[1]
    const accChar = match[2]
    const dChar = match[3]
    const p = PITCH_CONFIG[pChar]
    if (!p) return null

    // Stem down above middle line (B ≈ offset 4)
    const isDown = p.offset > 4
    let char = isDown ? SMUFL.quarterDown : SMUFL.quarterUp
    let hasDot = false

    if (dChar === '!') {
      char = isDown ? SMUFL.eighthDown : SMUFL.eighthUp
    } else if (dChar === '2') {
      char = isDown ? SMUFL.halfDown : SMUFL.halfUp
    } else if (dChar === '3') {
      char = isDown ? SMUFL.halfDown : SMUFL.halfUp
      hasDot = true
    } else if (dChar === '4') {
      char = SMUFL.whole
    } else if (dChar === '5') {
      char = isDown ? SMUFL.quarterDown : SMUFL.quarterUp
      hasDot = true
    }

    let accidental = null
    if (accChar === 'b') accidental = SMUFL.flat
    else if (accChar === '#') accidental = SMUFL.sharp
    if (pChar === 'M' && !accChar) accidental = SMUFL.flat

    return {
      offset: p.offset,
      char,
      accidental,
      ledgers: getLedgerLines(p.offset),
      dot: hasDot ? SMUFL.dot : null,
      isDown,
    }
  }).filter(Boolean)
}
