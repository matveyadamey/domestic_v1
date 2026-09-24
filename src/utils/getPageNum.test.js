import getPageNum from './getPageNum'

describe('getPageNum', () => {
  it('maps first pages to Church Slavonic numerals', () => {
    expect(getPageNum(0)).toBe('а7')
    expect(getPageNum(1)).toBe('в7')
    expect(getPageNum(9)).toBe('i7')
    expect(getPageNum(19)).toBe('к7')
  })

  it('returns empty string beyond supported range', () => {
    expect(getPageNum(20)).toBe('')
    expect(getPageNum(100)).toBe('')
  })
})
