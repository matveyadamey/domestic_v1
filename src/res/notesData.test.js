import notesIndex from '../res/notesIndex.json'
import { COMPOSITIONS } from '../res/index'
import { lookupNotesString } from '../utils/resolveNotes'
import { parseHightsForBravura } from '../utils/musicMap'

function compositionGroup(label) {
  return COMPOSITIONS.find((g) => g.label === label)
}

describe('notesIndex + compositions smoke', () => {
  it('has thousands of note keys', () => {
    expect(Object.keys(notesIndex).length).toBeGreaterThan(1000)
  })

  it('resolves common azbuka melodies to parseable strings', () => {
    const samples = [
      ['Чашка', 'Ми', []],
      ['Голубчик борзый', 'Фа', []],
      ['Стопица с очком Ут и Фа', 'Ут низкое', []],
      ['Змийца Ут и Фа', 'Ут низкое', ['Равенство']],
      ['Крыж', 'Ми', []],
    ]
    samples.forEach(([name, pitch, opts]) => {
      const notes = lookupNotesString(name, pitch, opts)
      expect(notes).toBeTruthy()
      expect(notes).not.toBe('###')
      expect(parseHightsForBravura(notes).length).toBeGreaterThan(0)
    })
  })

  it('compositions expose valueNotes aligned with value length', () => {
    expect(COMPOSITIONS.length).toBeGreaterThan(0)
    COMPOSITIONS.forEach((group) => {
      expect(group.value).toBeTruthy()
      group.value.forEach((comp) => {
        expect(comp.value.length).toBe(comp.valueNotes.length)
        comp.valueNotes.forEach((n) => {
          expect(n).toBeTruthy()
          expect(parseHightsForBravura(n).length).toBeGreaterThan(0)
        })
      })
    })
  })

  it('Кичиги valueNotes parse', () => {
    const comp = compositionGroup('Кичиги').value[0]
    expect(comp.valueNotes).toEqual(['с2н2', 'г!г!с1', 'н4'])
    comp.valueNotes.forEach((n) => {
      expect(parseHightsForBravura(n).length).toBeGreaterThan(0)
    })
  })

  it('documents Кулизма малая melodies by tone', () => {
    const comps = compositionGroup('Кулизма малая').value
    const byTone = {}
    comps.forEach((comp) => {
      byTone[comp.tone] = comp.valueNotes
      expect(comp.valueNotes.length).toBe(3)
      comp.valueNotes.forEach((n) => {
        expect(parseHightsForBravura(n).length).toBeGreaterThan(0)
      })
    })
    expect(byTone['1']).toEqual(['с1м1с1н1', 'г1н1г1ц1', 'Н4'])
    expect(byTone['2']).toEqual(['с1м1с1н1с2', 'с1н1с1м1', 'п2м2с2'])
    expect(byTone['3']).toEqual(['в1п1в2', 'п2м2', 'п4'])
    expect(byTone['4']).toEqual(['с1н1с2', 'н4', 'г4'])
    expect(byTone['5']).toEqual(['в1М1в1п1', 'м1п1м1с1', 'н4'])
    expect(byTone['7']).toEqual(['с1н1с2', 'н4', 'г4'])
  })
})
