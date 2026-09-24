import paperReducer from './paperReducer'
import {
  ADD_SYLLABLE,
  REMOVE_SYLLABLE_BY_INDEX,
  ADD_PAGE,
  CHANGE_PAGE,
  SET_SYLLABLES,
  TOGGLE_SHOW_PAGINATION,
} from '../constants/'

const baseState = {
  syllables: [[[]]],
  currentPageNum: 0,
  currentParagraphNum: 0,
  showPagination: true,
  showModalDeletePage: false,
}

describe('paperReducer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial-shaped state for unknown action', () => {
    const state = paperReducer(baseState, { type: '@@INIT' })
    expect(state.syllables).toEqual(baseState.syllables)
  })

  it('ADD_SYLLABLE appends to current paragraph', () => {
    const syllable = { type: 'KRUK', value: 'a', text: 'а' }
    const state = paperReducer(baseState, { type: ADD_SYLLABLE, payload: syllable })
    expect(state.syllables[0][0]).toEqual([syllable])
    expect(JSON.parse(localStorage.getItem('pages'))[0][0]).toHaveLength(1)
  })

  it('REMOVE_SYLLABLE_BY_INDEX removes item', () => {
    const start = {
      ...baseState,
      syllables: [[
        [
          { type: 'KRUK', value: 'a', text: 'а' },
          { type: 'KRUK', value: 'b', text: 'б' },
        ],
      ]],
    }
    const state = paperReducer(start, { type: REMOVE_SYLLABLE_BY_INDEX, payload: 0 })
    expect(state.syllables[0][0]).toHaveLength(1)
    expect(state.syllables[0][0][0].value).toBe('b')
  })

  it('ADD_PAGE / CHANGE_PAGE update navigation', () => {
    let state = paperReducer(baseState, { type: ADD_PAGE })
    expect(state.syllables).toHaveLength(2)
    expect(state.currentPageNum).toBe(1)
    state = paperReducer(state, { type: CHANGE_PAGE, payload: 0 })
    expect(state.currentPageNum).toBe(0)
  })

  it('SET_SYLLABLES replaces document', () => {
    const pages = [[[{ type: 'KRUK', value: 'x', text: 'х' }]]]
    const state = paperReducer(baseState, { type: SET_SYLLABLES, payload: pages })
    expect(state.syllables).toEqual(pages)
  })

  it('SET_SYLLABLES clamps page/paragraph cursors', () => {
    const start = {
      ...baseState,
      currentPageNum: 5,
      currentParagraphNum: 3,
    }
    const pages = [[[{ type: 'KRUK', value: 'x', text: 'х' }]]]
    const state = paperReducer(start, { type: SET_SYLLABLES, payload: pages })
    expect(state.currentPageNum).toBe(0)
    expect(state.currentParagraphNum).toBe(0)
  })

  it('TOGGLE_SHOW_PAGINATION flips flag', () => {
    const state = paperReducer(baseState, { type: TOGGLE_SHOW_PAGINATION })
    expect(state.showPagination).toBe(false)
  })
})
