import {
  flattenToOnePage,
  normalizeSyllables,
  mergeMelismaParagraphs,
  prepareLoadedSyllables,
  spillSyllablesToNextPage,
} from './paginateOverflow'

const kruk = (value, text = 'а') => ({ type: 'KRUK', value, text })
const dash = value => ({ type: 'KRUK', value, text: '-' })

describe('paginateOverflow', () => {
  describe('flattenToOnePage', () => {
    it('returns empty page for empty input', () => {
      expect(flattenToOnePage([])).toEqual([[]])
      expect(flattenToOnePage(null)).toEqual([[]])
    })

    it('merges all paragraphs onto one page', () => {
      const pages = [
        [[kruk('a')], [kruk('b')]],
        [[kruk('c')]],
      ]
      expect(flattenToOnePage(pages)).toEqual([
        [[kruk('a')], [kruk('b')], [kruk('c')]],
      ])
    })
  })

  describe('normalizeSyllables', () => {
    it('drops duplicate same-value KRUK when second is dash', () => {
      const pages = [[[kruk('X', 'те'), dash('X')]]]
      const out = normalizeSyllables(pages)
      expect(out[0][0]).toHaveLength(1)
      expect(out[0][0][0].text).toBe('те')
    })

    it('keeps syllable with real text over preceding dash duplicate', () => {
      const pages = [[[dash('X'), kruk('X', 'го')]]]
      const out = normalizeSyllables(pages)
      expect(out[0][0]).toHaveLength(1)
      expect(out[0][0][0].text).toBe('го')
    })
  })

  describe('mergeMelismaParagraphs', () => {
    it('appends melisma-starting paragraph to previous', () => {
      const pages = [[
        [kruk('A', 'те')],
        [dash('B'), dash('C')],
      ]]
      const out = mergeMelismaParagraphs(pages)
      expect(out[0]).toHaveLength(1)
      expect(out[0][0].map(s => s.text)).toEqual(['те', '-', '-'])
    })

    it('leaves non-melisma paragraphs alone', () => {
      const pages = [[[kruk('A')], [kruk('B', 'бо')]]]
      expect(mergeMelismaParagraphs(pages)).toEqual(pages)
    })
  })

  describe('prepareLoadedSyllables', () => {
    it('flattens, dedupes and merges melisma', () => {
      const pages = [
        [[kruk('X', 'а')], [dash('X')]],
        [[kruk('Y', 'бо')]],
      ]
      const out = prepareLoadedSyllables(pages)
      expect(out).toHaveLength(1)
      expect(out[0].length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('spillSyllablesToNextPage', () => {
    it('returns null when cut would empty the only paragraph from start', () => {
      const pages = [[[kruk('a'), kruk('b')]]]
      expect(spillSyllablesToNextPage(pages, 0, 0, 0)).toBeNull()
    })

    it('moves tail of paragraph to next page', () => {
      const pages = [[[kruk('a'), kruk('b'), kruk('c')]]]
      const out = spillSyllablesToNextPage(pages, 0, 0, 2)
      expect(out).not.toBeNull()
      expect(out[0][0].map(s => s.value)).toEqual(['a', 'b'])
      expect(out[1][0].map(s => s.value)).toEqual(['c'])
    })

    it('returns null when cut includes bucvica at paragraph start', () => {
      const pages = [[
        [
          { type: 'BUCVICA', text: 'Б' },
          kruk('a', 'ог'),
          kruk('b', 'ъ'),
        ],
      ]]
      // cut on first kruk pulls bucvica → start 0 → cannot spill whole first para
      expect(spillSyllablesToNextPage(pages, 0, 0, 1)).toBeNull()
    })

    it('spills from middle keeping bucvica+head', () => {
      const pages = [[
        [
          { type: 'BUCVICA', text: 'Б' },
          kruk('a', 'ог'),
          kruk('b', 'ъ'),
          kruk('c', 'и'),
        ],
      ]]
      const out = spillSyllablesToNextPage(pages, 0, 0, 2)
      expect(out).not.toBeNull()
      expect(out[0][0].map(s => (s.type === 'KRUK' ? s.value : s.type))).toEqual(['BUCVICA', 'a'])
      expect(out[1][0].map(s => s.value)).toEqual(['b', 'c'])
    })
  })
})
