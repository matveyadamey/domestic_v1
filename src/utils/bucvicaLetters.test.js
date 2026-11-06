import {
  OLD_SLAVONIC_BY_KEY,
  oldSlavonicFromKeyEvent,
  legacyGlyphFor,
} from './bucvicaLetters'

describe('bucvicaLetters', () => {
  it('maps Alt + key code to Old Slavonic letter in any layout', () => {
    expect(oldSlavonicFromKeyEvent({ altKey: true, code: 'KeyB', key: 'b' })).toBe('Ї')
    expect(oldSlavonicFromKeyEvent({ altKey: true, code: 'KeyT', key: 'е' })).toBe('Ѣ')
    // React synthetic event: code only on nativeEvent
    expect(oldSlavonicFromKeyEvent({
      altKey: true, key: 'b', nativeEvent: { code: 'KeyB' },
    })).toBe('Ї')
  })

  it('ignores keys without Alt or without an Old Slavonic variant', () => {
    expect(oldSlavonicFromKeyEvent({ altKey: false, code: 'KeyB', key: 'и' })).toBeNull()
    expect(oldSlavonicFromKeyEvent({ altKey: true, code: 'KeyF', key: 'а' })).toBeNull()
    expect(oldSlavonicFromKeyEvent({
      altKey: true, ctrlKey: true, code: 'KeyB', key: 'и',
    })).toBeNull()
  })

  it('draws Old Slavonic letters from their legacy Russian slot', () => {
    Object.keys(OLD_SLAVONIC_BY_KEY).forEach((key) => {
      expect(legacyGlyphFor(OLD_SLAVONIC_BY_KEY[key])).toBe(key)
    })
    expect(legacyGlyphFor('И')).toBeNull()
  })
})
