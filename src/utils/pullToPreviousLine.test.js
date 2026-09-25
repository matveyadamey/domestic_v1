import { countFittingSyllables } from './pullToPreviousLine'

describe('countFittingSyllables', () => {
  it('returns 0 when nothing fits', () => {
    expect(countFittingSyllables([40, 40], 10)).toBe(0)
  })

  it('fits as many as width allows', () => {
    expect(countFittingSyllables([30, 30, 30], 65)).toBe(2)
  })

  it('fits all when enough room', () => {
    expect(countFittingSyllables([20, 20], 100)).toBe(2)
  })
})
