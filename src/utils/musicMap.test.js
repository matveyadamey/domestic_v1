import {
  PITCH_CONFIG,
  parseHightsForBravura,
  SMUFL,
} from './musicMap'

describe('musicMap', () => {
  describe('PITCH_CONFIG', () => {
    it('places Ми on the bottom staff line (offset 0)', () => {
      expect(PITCH_CONFIG.s.offset).toBe(0)
    })

    it('places small-octave fa/mi below Ут низкое', () => {
      expect(PITCH_CONFIG.F.offset).toBeLessThan(PITCH_CONFIG.G.offset)
      expect(PITCH_CONFIG.E.offset).toBeLessThan(PITCH_CONFIG.F.offset)
    })

    it('places first-octave sol above fa', () => {
      expect(PITCH_CONFIG.p.offset).toBeGreaterThan(PITCH_CONFIG.m.offset)
    })
  })

  describe('parseHightsForBravura', () => {
    it('returns empty array for empty input', () => {
      expect(parseHightsForBravura(null)).toEqual([])
      expect(parseHightsForBravura('')).toEqual([])
      expect(parseHightsForBravura(undefined)).toEqual([])
    })

    it('parses Cyrillic pitch letters and quarter durations', () => {
      const notes = parseHightsForBravura('с1н1')
      expect(notes).toHaveLength(2)
      expect(notes[0].offset).toBe(PITCH_CONFIG.s.offset)
      expect(notes[1].offset).toBe(PITCH_CONFIG.n.offset)
      expect(notes[0].char).toBe(SMUFL.quarterUp)
    })

    it('parses half and whole durations', () => {
      const half = parseHightsForBravura('м2')[0]
      const whole = parseHightsForBravura('п4')[0]
      expect(half.char).toBe(SMUFL.halfUp)
      expect(whole.char).toBe(SMUFL.whole)
    })

    it('parses eighth notes with !', () => {
      const note = parseHightsForBravura('г!')[0]
      expect(note.char).toBe(SMUFL.eighthUp)
    })

    it('parses dotted half (duration 3)', () => {
      const note = parseHightsForBravura('н3')[0]
      expect(note.char).toBe(SMUFL.halfUp)
      expect(note.dot).toBe(SMUFL.dot)
    })

    it('maps small-octave Cyrillic Е/Ф/Г to low staff offsets', () => {
      const notes = parseHightsForBravura('Г1Ф1')
      expect(notes).toHaveLength(2)
      expect(notes[0].offset).toBe(PITCH_CONFIG.G.offset)
      expect(notes[1].offset).toBe(PITCH_CONFIG.F.offset)
      expect(notes[0].ledgers.length).toBeGreaterThan(0)
    })

    it('parses змийца-style small-octave run', () => {
      const notes = parseHightsForBravura('Ф1Г1Ф1Е1')
      expect(notes.map(n => n.offset)).toEqual([
        PITCH_CONFIG.F.offset,
        PITCH_CONFIG.G.offset,
        PITCH_CONFIG.F.offset,
        PITCH_CONFIG.E.offset,
      ])
    })

    it('adds flat accidental for Фа высокое (M) by default', () => {
      const note = parseHightsForBravura('М2')[0]
      expect(note.accidental).toBe(SMUFL.flat)
    })

    it('honors explicit flat/sharp markers', () => {
      const flat = parseHightsForBravura('sb1')[0]
      const sharp = parseHightsForBravura('s#1')[0]
      expect(flat.accidental).toBe(SMUFL.flat)
      expect(sharp.accidental).toBe(SMUFL.sharp)
    })

    it('stems high notes downward', () => {
      const high = parseHightsForBravura('V1')[0]
      expect(high.isDown).toBe(true)
      expect(high.char).toBe(SMUFL.quarterDown)
    })
  })
})
