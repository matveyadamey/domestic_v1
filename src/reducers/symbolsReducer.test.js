import symbolsReducer from './symbolsReducer'
import {
  FILTER_SYMBOLS_BY_NAME,
  FILTER_SYMBOLS_BY_OPTIONS,
  FILTER_SYMBOLS_BY_PITCH,
  CHECK_ERROR,
  CREATE_PITCH_LIST,
  GET_COMPOSITIONS,
  ERROR_NO_DEFINE_SYMBOL,
} from '../constants/'

describe('symbolsReducer', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    console.log.mockRestore()
  })

  it('FILTER_SYMBOLS_BY_NAME selects KRUKI group by label', () => {
    const state = symbolsReducer(undefined, {
      type: FILTER_SYMBOLS_BY_NAME,
      payload: 'Чашка',
    })
    expect(state.currentSymbols.label).toBe('Чашка')
    expect(Array.isArray(state.currentSymbols.value)).toBe(true)
  })

  it('FILTER_SYMBOLS_BY_OPTIONS then PITCH narrows list', () => {
    const named = symbolsReducer(undefined, {
      type: FILTER_SYMBOLS_BY_NAME,
      payload: 'Чашка',
    })
    const byOpts = symbolsReducer(named, {
      type: FILTER_SYMBOLS_BY_OPTIONS,
      payload: [],
    })
    expect(byOpts.symbolsFilteredByOptions.length).toBeGreaterThan(0)

    const byPitch = symbolsReducer(byOpts, {
      type: FILTER_SYMBOLS_BY_PITCH,
      payload: 'Ми',
    })
    expect(byPitch.symbolsFilteredByPitch.every(s => s.pitch === 'Ми')).toBe(true)
    expect(byPitch.error).toBe('')
  })

  it('CHECK_ERROR sets message for empty list', () => {
    const state = symbolsReducer(undefined, {
      type: CHECK_ERROR,
      payload: [],
    })
    expect(state.error).toMatch(/нет в базе/i)
  })

  it('CHECK_ERROR clears error when symbols exist', () => {
    const state = symbolsReducer(undefined, {
      type: CHECK_ERROR,
      payload: [{ pitch: 'Ми' }],
    })
    expect(state.error).toBe('')
  })

  it('CREATE_PITCH_LIST builds unique pitches from filtered symbols', () => {
    const named = symbolsReducer(undefined, {
      type: FILTER_SYMBOLS_BY_NAME,
      payload: 'Чашка',
    })
    const byOpts = symbolsReducer(named, {
      type: FILTER_SYMBOLS_BY_OPTIONS,
      payload: [],
    })
    // CREATE_PITCH_LIST maps currentSymbols as array of glyphs
    const ready = {
      ...byOpts,
      currentSymbols: byOpts.symbolsFilteredByOptions,
    }
    const state = symbolsReducer(ready, { type: CREATE_PITCH_LIST })
    expect(state.pitchs.length).toBeGreaterThan(0)
    expect(state.pitchs[0]).toHaveProperty('label')
  })

  it('GET_COMPOSITIONS exposes compositions list', () => {
    const state = symbolsReducer(undefined, { type: GET_COMPOSITIONS })
    expect(state.compositions.length).toBeGreaterThan(0)
    expect(state.compositions[0].label).toBeTruthy()
  })

  it('ERROR_NO_DEFINE_SYMBOL sets selection error', () => {
    const state = symbolsReducer(undefined, { type: ERROR_NO_DEFINE_SYMBOL })
    expect(state.error).toMatch(/Не выбран/i)
  })
})
