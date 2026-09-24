import {
  lastPitchFromNotes,
  isEqualityPitch,
  isGolubchikName,
  usesForwardEquality,
  makeNotesKey,
  lookupNotesString,
  resolveEqualityNotes,
  resolveForwardEqualityNotes,
  resolveNotesString,
  resolveParagraphNotesMap,
  effectivePitchOf,
  enrichSyllableWithNotes,
  findPreviousKruk,
} from './resolveNotes'

describe('resolveNotes', () => {
  describe('lastPitchFromNotes', () => {
    it('returns null for empty input', () => {
      expect(lastPitchFromNotes(null)).toBeNull()
      expect(lastPitchFromNotes('')).toBeNull()
    })

    it('reads last pitch letter from a notes string', () => {
      expect(lastPitchFromNotes('н1с1м2')).toBe('Фа')
      expect(lastPitchFromNotes('Г1Ф1')).toBe('Фа малой')
      expect(lastPitchFromNotes('н1с1')).toBe('Ми')
    })
  })

  describe('isEqualityPitch / golubchik helpers', () => {
    it('treats -, empty and null as equality pitch', () => {
      expect(isEqualityPitch('-')).toBe(true)
      expect(isEqualityPitch('')).toBe(true)
      expect(isEqualityPitch(null)).toBe(true)
      expect(isEqualityPitch('Ми')).toBe(false)
    })

    it('detects Голубчик names and forward equality', () => {
      expect(isGolubchikName('Голубчик борзый')).toBe(true)
      expect(isGolubchikName('Крюк')).toBe(false)
      expect(usesForwardEquality('Голубчик борзый', '-')).toBe(true)
      expect(usesForwardEquality('Голубчик борзый', 'Ми')).toBe(false)
      expect(usesForwardEquality('Крюк', '-')).toBe(false)
    })
  })

  describe('makeNotesKey / lookupNotesString', () => {
    it('sorts opts in the key', () => {
      expect(makeNotesKey('Крюк', 'Ми', ['Ломка', 'Борзая']))
        .toBe('Крюк|Ми|Борзая,Ломка')
    })

    it('looks up known Голубчик борзый Ми', () => {
      expect(lookupNotesString('Голубчик борзый', 'Ми', [])).toBe('н1с1')
      expect(lookupNotesString('Голубчик борзый', 'Ми', ['Ломка'])).toBe('г1с1')
    })

    it('returns null for unknown or ### keys', () => {
      expect(lookupNotesString('НетТакого', 'Ми', [])).toBeNull()
    })
  })

  describe('resolveEqualityNotes (backward)', () => {
    it('uses last pitch of previous notes as upper tone', () => {
      // previous ends on Фа → голубчик would be с1м1, but this helper is for any name
      expect(resolveEqualityNotes({
        name: 'Голубчик борзый',
        opts: ['Равенство'],
        prevNotes: 'м2',
        prevPitch: null,
      })).toBe('с1м1')
    })

    it('falls back to prevPitch when notes missing', () => {
      expect(resolveEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        prevNotes: null,
        prevPitch: 'Соль',
      })).toBe('м1п1')
    })
  })

  describe('resolveForwardEqualityNotes (Голубчик)', () => {
    it('uses next kruk pometa as upper tone', () => {
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: ['Равенство'],
        nextNotes: null,
        nextPitch: 'Фа',
      })).toBe('с1м1')
    })

    it('resolves low and high pometas used in the pitch list', () => {
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ут низкое',
      })).toBe('Ф1Г1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: ['Ломка'],
        nextNotes: null,
        nextPitch: 'Ут низкое',
      })).toBe('Е1Г1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ре низкое',
      })).toBe('Г1Н1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ля высокое',
      })).toBe('П1В1')
    })

    it('uses last note of next when next has no pometa', () => {
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: 'н1с1',
        nextPitch: '-',
      })).toBe('н1с1')
    })
  })

  describe('resolveNotesString', () => {
    it('returns notesFixed as-is', () => {
      expect(resolveNotesString({
        notes: 'с1м1',
        notesFixed: true,
        name: 'Статья',
        pitch: '-',
      })).toBe('с1м1')
    })

    it('resolves Малая закрытая as half + two quarters down', () => {
      expect(lookupNotesString('Малая закрытая Ут и Фа', 'Фа', [])).toBe('м2м1с1')
      expect(lookupNotesString('Малая закрытая Ми и Ля', 'Ми', ['Равенство'])).toBe('с2с1н1')
      expect(lookupNotesString('Малая закрытая Ре и Соль', 'Ре', ['Равенство'])).toBe('н2н1г1')
      // Broken export markup still resolves via catalog
      expect(resolveNotesString({
        value: "<span <span class='red'>íÐ</span>W y",
        name: null,
        pitch: null,
      })).toBe('н2н1г1')
    })

    it('resolves Статья простая с подверткой (N6) as two quarters down', () => {
      expect(lookupNotesString('Статья простая', 'Ми', ['Подвертка', 'Простая'])).toBe('с1н1')
      expect(lookupNotesString('Статья простая', 'Фа', ['Подвертка', 'Простая', 'Равенство'])).toBe('м1с1')
      expect(resolveNotesString({
        value: "<span class='red'>ð+</span>N6",
        name: null,
        pitch: null,
        opts: null,
        prevNotes: 'м2',
        prevPitch: 'Фа',
      })).toBe('м1с1')
    })

    it('resolves Голубчик without pometa from next pitch', () => {
      expect(resolveNotesString({
        name: 'Голубчик борзый',
        pitch: '-',
        opts: ['Равенство'],
        nextPitch: 'Ми',
      })).toBe('н1с1')
    })
  })

  describe('resolveParagraphNotesMap', () => {
    it('resolves a chain of equality golubchiks from the end', () => {
      const paragraph = [
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
        { type: 'KRUK', name: 'Крюк Ми', pitch: 'Ми', opts: [], value: 'x' },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      expect(map[0]).toBe('н1с1')
      expect(map[1]).toBe('н1с1')
      // Крюк Ми may or may not be in index under that exact name — only assert golubchiks
    })

    it('resolves Стопица then Голубчик from next (forward)', () => {
      const paragraph = [
        { type: 'TEXT', text: 'а' },
        {
          type: 'KRUK',
          name: 'Голубчик борзый',
          pitch: '-',
          opts: ['Равенство'],
          value: 'g',
        },
        {
          type: 'KRUK',
          name: 'Стопица Ут и Фа',
          pitch: 'Фа',
          opts: [],
          value: 'S',
        },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      expect(map[1]).toBe('с1м1')
    })

    it('applies Кулизма малая valueNotes to bare glyph runs', () => {
      const paragraph = [
        { type: 'KRUK', text: 'Я', value: "<span class='red'>ïá</span>W6" },
        { type: 'KRUK', text: 'тво', value: 'S y' },
        { type: 'KRUK', text: 'рЯ', value: 'S' },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      // default auto-match: 4 глас
      expect(map[0]).toBe('с1н1с2')
      expect(map[1]).toBe('н4')
      expect(map[2]).toBe('г4')
    })

    it('applies Кулизма малая ending with крыж', () => {
      const paragraph = [
        { type: 'KRUK', text: 'мЯть', value: "<span class='red'>ïá</span>W6" },
        { type: 'KRUK', text: 'тво', value: 'S y' },
        { type: 'KRUK', text: 'ю.', value: 'Q' },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      expect(map[0]).toBe('с1н1с2')
      expect(map[1]).toBe('н4')
      expect(map[2]).toBe('г4')
    })
  })

  describe('effectivePitchOf / enrich / findPreviousKruk', () => {
    it('effectivePitchOf prefers explicit pitch', () => {
      expect(effectivePitchOf({ pitch: 'Ми' }, 'н1с1')).toBe('Ми')
      expect(effectivePitchOf({ pitch: '-' }, 'н1с1')).toBe('Ми')
    })

    it('enrichSyllableWithNotes fills equality from next', () => {
      const enriched = enrichSyllableWithNotes(
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
        null,
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k' },
      )
      expect(enriched.notes).toBe('с1м1')
    })

    it('findPreviousKruk walks back past non-KRUK', () => {
      const list = [
        { type: 'KRUK', name: 'A' },
        { type: 'TEXT' },
        { type: 'KRUK', name: 'B' },
      ]
      expect(findPreviousKruk(list, 2).name).toBe('A')
      expect(findPreviousKruk(list, 0)).toBeNull()
    })
  })
})
