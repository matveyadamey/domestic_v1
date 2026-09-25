import {
  lastPitchFromNotes,
  isEqualityPitch,
  isGolubchikName,
  hasRavenstvoOpt,
  usesForwardEquality,
  usesGolubchikBackwardEquality,
  usesBackwardEquality,
  isZmiycaName,
  zmiycaNameForPitch,
  equalityNameForPitch,
  usesZmiycaBackwardEquality,
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

    it('detects Голубчик names and forward vs backward equality', () => {
      expect(isGolubchikName('Голубчик борзый')).toBe(true)
      expect(isGolubchikName('Крюк')).toBe(false)
      expect(hasRavenstvoOpt(['Равенство'])).toBe(true)
      expect(hasRavenstvoOpt([])).toBe(false)
      // без пометы → к следующему
      expect(usesForwardEquality('Голубчик борзый', '-', [])).toBe(true)
      expect(usesForwardEquality('Голубчик борзый', '-', null)).toBe(true)
      expect(usesForwardEquality('Голубчик борзый', 'Ми', [])).toBe(false)
      expect(usesForwardEquality('Крюк', '-', [])).toBe(false)
      // с равенством → к предыдущему
      expect(usesForwardEquality('Голубчик борзый', '-', ['Равенство'])).toBe(false)
      expect(usesGolubchikBackwardEquality('Голубчик борзый', '-', ['Равенство'])).toBe(true)
      expect(usesGolubchikBackwardEquality('Голубчик борзый', '-', [])).toBe(false)
    })

    it('maps Змийца family by pometa and detects backward equality', () => {
      expect(isZmiycaName('Змийца Ут и Фа')).toBe(true)
      expect(isZmiycaName('Крюк')).toBe(false)
      expect(zmiycaNameForPitch('Фа')).toBe('Змийца Ут и Фа')
      expect(zmiycaNameForPitch('Соль')).toBe('Змийца Ре')
      expect(zmiycaNameForPitch('Ми')).toBe('Змийца Ми и Ля')
      expect(equalityNameForPitch('Малая закрытая Ут и Фа', 'Ми'))
        .toBe('Малая закрытая Ми и Ля')
      expect(usesZmiycaBackwardEquality('Змийца Ут и Фа', ['Равенство'])).toBe(true)
      expect(usesZmiycaBackwardEquality('Змийца Ут и Фа', [])).toBe(false)
      // any Равенство → backward; голубчик без пометы → not
      expect(usesBackwardEquality('Статья простая', 'Фа', ['Равенство'])).toBe(true)
      expect(usesBackwardEquality('Змийца Ут и Фа', 'Ут', ['Равенство'])).toBe(true)
      expect(usesBackwardEquality('Голубчик борзый', '-', [])).toBe(false)
      expect(usesBackwardEquality('Голубчик борзый', '-', ['Равенство'])).toBe(true)
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
      // previous ends on Фа → голубчик с1м1
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

  describe('resolveForwardEqualityNotes (Голубчик без пометы)', () => {
    it('looks up one step below the next kruk pometa (before Фа → ре ми)', () => {
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Фа',
      })).toBe('н1с1')
    })

    it('resolves low and high pometas used in the pitch list', () => {
      // before Ут низкое → Фа малой
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ут низкое',
      })).toBe('Е1Ф1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: ['Ломка'],
        nextNotes: null,
        nextPitch: 'Ут низкое',
      })).toBe('Е1Ф1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ре низкое',
      })).toBe('Ф1Г1')
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: null,
        nextPitch: 'Ля высокое',
      })).toBe('М1П1')
    })

    it('uses step below last note of next when next has no pometa', () => {
      // next ends on Ми (с) → look up Ре → г1н1
      expect(resolveForwardEqualityNotes({
        name: 'Голубчик борзый',
        opts: [],
        nextNotes: 'н1с1',
        nextPitch: '-',
      })).toBe('г1н1')
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

    it('resolves Голубчик без пометы from next pitch (step below)', () => {
      // before Ми → Ре → г1н1
      expect(resolveNotesString({
        name: 'Голубчик борзый',
        pitch: '-',
        opts: [],
        nextPitch: 'Ми',
      })).toBe('г1н1')
      // before Фа → Ми → н1с1
      expect(resolveNotesString({
        name: 'Голубчик борзый',
        pitch: '-',
        opts: [],
        nextPitch: 'Фа',
      })).toBe('н1с1')
    })

    it('resolves Голубчик с равенством from previous pitch', () => {
      // previous Фа → с1м1
      expect(resolveNotesString({
        name: 'Голубчик борзый',
        pitch: '-',
        opts: ['Равенство'],
        prevPitch: 'Фа',
        nextPitch: 'Соль',
      })).toBe('с1м1')
      // previous Ми → н1с1 (next must not win)
      expect(resolveNotesString({
        name: 'Голубчик борзый',
        pitch: '-',
        opts: ['Равенство'],
        prevPitch: 'Ми',
        nextPitch: 'Фа',
      })).toBe('н1с1')
    })

    it('resolves Змийца с равенством from previous pitch (upper = previous pometa)', () => {
      // catalog pitch Ут низкое, but previous Фа → с1м1с1н1
      expect(resolveNotesString({
        name: 'Змийца Ут и Фа',
        pitch: 'Ут низкое',
        opts: ['Равенство'],
        prevPitch: 'Фа',
      })).toBe('с1м1с1н1')
      // previous Соль → м1п1м1с1 (family Змийца Ре)
      expect(resolveNotesString({
        name: 'Змийца Ре',
        pitch: 'Ре',
        opts: ['Равенство'],
        prevPitch: 'Соль',
      })).toBe('м1п1м1с1')
      // cross-family: glyph was Ут/Фа, previous Ми → Змийца Ми и Ля
      expect(resolveNotesString({
        name: 'Змийца Ут и Фа',
        pitch: 'Фа',
        opts: ['Равенство'],
        prevPitch: 'Ми',
      })).toBe('н1с1н1г1')
    })

    it('leaves Змийца without Равенство on its own pitch', () => {
      expect(resolveNotesString({
        name: 'Змийца Ут и Фа',
        pitch: 'Фа',
        opts: [],
        prevPitch: 'Ми',
      })).toBe('с1м1с1н1')
    })

    it('resolves any kruk with Равенство from previous pitch', () => {
      // Статья: catalog pitch ignored when Равенство + previous Ми
      expect(resolveNotesString({
        name: 'Статья простая',
        pitch: 'Фа',
        opts: ['Подвертка', 'Простая', 'Равенство'],
        prevPitch: 'Ми',
      })).toBe('с1н1')
      // Малая закрытая: cross-family remap Ут и Фа → Ми и Ля
      expect(resolveNotesString({
        name: 'Малая закрытая Ут и Фа',
        pitch: 'Фа',
        opts: ['Равенство'],
        prevPitch: 'Ми',
      })).toBe('с2с1н1')
    })
  })

  describe('resolveParagraphNotesMap', () => {
    it('resolves a chain of Голубчик без пометы from the end (forward)', () => {
      const paragraph = [
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: [], value: 'g' },
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: [], value: 'g' },
        { type: 'KRUK', name: 'Крюк Ми', pitch: 'Ми', opts: [], value: 'x' },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      // before Ми → Ре; before that golubchik (ends Ре) → Ут
      expect(map[1]).toBe('г1н1')
      expect(map[0]).toBe('ц1г1')
    })

    it('resolves a chain of Голубчик с равенством from the previous (backward)', () => {
      const paragraph = [
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k' },
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      // previous Фа → с1м1; then previous ends on Фа → с1м1 again
      expect(map[1]).toBe('с1м1')
      expect(map[2]).toBe('с1м1')
    })

    it('resolves Голубчик с равенством to previous, not following Стопица', () => {
      const paragraph = [
        { type: 'KRUK', name: 'Крюк', pitch: 'Ре', opts: [], value: 'k' },
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
      // previous Ре → г1н1 (not н1с1 from following Фа)
      expect(map[1]).toBe('г1н1')
    })

    it('resolves Голубчик без пометы before Стопица from next (forward)', () => {
      const paragraph = [
        { type: 'TEXT', text: 'а' },
        {
          type: 'KRUK',
          name: 'Голубчик борзый',
          pitch: '-',
          opts: [],
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
      expect(map[1]).toBe('н1с1')
    })

    it('resolves Змийца с равенством from previous kruk pometa', () => {
      const paragraph = [
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k' },
        {
          type: 'KRUK',
          name: 'Змийца Ут и Фа',
          pitch: 'Ут',
          opts: ['Равенство'],
          value: "<span class='red'>ð</span>b",
        },
      ]
      const map = resolveParagraphNotesMap(paragraph)
      expect(map[1]).toBe('с1м1с1н1')
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

    it('enrichSyllableWithNotes fills Голубчик без пометы from next', () => {
      const enriched = enrichSyllableWithNotes(
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: [], value: 'g' },
        null,
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k' },
      )
      expect(enriched.notes).toBe('н1с1')
    })

    it('enrichSyllableWithNotes fills Голубчик с равенством from previous', () => {
      const enriched = enrichSyllableWithNotes(
        { type: 'KRUK', name: 'Голубчик борзый', pitch: '-', opts: ['Равенство'], value: 'g' },
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k', notes: 'м2' },
        { type: 'KRUK', name: 'Стопица', pitch: 'Соль', opts: [], value: 'S' },
      )
      expect(enriched.notes).toBe('с1м1')
    })

    it('enrichSyllableWithNotes refreshes Змийца с равенством from previous', () => {
      const enriched = enrichSyllableWithNotes(
        {
          type: 'KRUK',
          name: 'Змийца Ут и Фа',
          pitch: 'Ут низкое',
          opts: ['Равенство'],
          value: "<span class='red'>ð</span>b",
          notes: 'Ф1Г1Ф1Е1',
        },
        { type: 'KRUK', name: 'Крюк', pitch: 'Фа', opts: [], value: 'k', notes: 'м2' },
        null,
      )
      expect(enriched.notes).toBe('с1м1с1н1')
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
