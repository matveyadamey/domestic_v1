import paperReducer from './paperReducer'
import {
  ADD_SYLLABLE,
  REMOVE_SYLLABLE_BY_INDEX,
  ADD_PAGE,
  CHANGE_PAGE,
  SET_SYLLABLES,
  TOGGLE_SHOW_PAGINATION,
  TOGGLE_SHOW_DVOEZNAMENNIK,
  UNDO,
  SET_SELECTION,
  COPY_SELECTION,
  CUT_SELECTION,
  PASTE_CLIPBOARD,
  DELETE_SELECTION,
  EXTEND_SELECTION,
} from '../constants/'

const baseState = {
  syllables: [[[]]],
  currentPageNum: 0,
  currentParagraphNum: 0,
  showPagination: true,
  showDvoeznamennik: true,
  caretIndex: null,
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
    expect(state.caretIndex).toBe(1)
    expect(JSON.parse(localStorage.getItem('pages'))[0][0]).toHaveLength(1)
  })

  it('ADD_SYLLABLE inserts at caretIndex', () => {
    const start = {
      ...baseState,
      syllables: [[[
        { type: 'KRUK', value: 'a', text: 'а' },
        { type: 'KRUK', value: 'c', text: 'в' },
      ]]],
      caretIndex: 1,
    }
    const mid = { type: 'KRUK', value: 'b', text: 'б' }
    const state = paperReducer(start, { type: ADD_SYLLABLE, payload: mid })
    expect(state.syllables[0][0].map(s => s.value)).toEqual(['a', 'b', 'c'])
    expect(state.caretIndex).toBe(2)
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
      caretIndex: 1,
    }
    const state = paperReducer(start, { type: REMOVE_SYLLABLE_BY_INDEX, payload: { index: 0 } })
    expect(state.syllables[0][0]).toHaveLength(1)
    expect(state.syllables[0][0][0].value).toBe('b')
    expect(state.caretIndex).toBe(0)
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

  it('TOGGLE_SHOW_DVOEZNAMENNIK flips flag and persists', () => {
    localStorage.removeItem('showDvoeznamennik')
    const on = paperReducer(baseState, { type: TOGGLE_SHOW_DVOEZNAMENNIK })
    expect(on.showDvoeznamennik).toBe(false)
    expect(localStorage.getItem('showDvoeznamennik')).toBe('false')
    const off = paperReducer(on, { type: TOGGLE_SHOW_DVOEZNAMENNIK })
    expect(off.showDvoeznamennik).toBe(true)
  })

  it('TOGGLE_SHOW_DVOEZNAMENNIK flattens pages for reflow', () => {
    const a = { type: 'KRUK', value: 'a', text: 'а' }
    const b = { type: 'KRUK', value: 'b', text: 'б' }
    const start = {
      ...baseState,
      syllables: [[[a]], [[b]]],
      currentPageNum: 1,
      currentParagraphNum: 0,
      caretIndex: 1,
    }
    const state = paperReducer(start, { type: TOGGLE_SHOW_DVOEZNAMENNIK })
    expect(state.syllables).toHaveLength(1)
    expect(state.syllables[0]).toHaveLength(2)
    expect(state.currentPageNum).toBe(0)
    expect(state.caretIndex).toBe(null)
  })

  it('UNDO restores previous syllables after ADD_SYLLABLE', () => {
    const syllable = { type: 'KRUK', value: 'a', text: 'а' }
    const withItem = paperReducer(baseState, { type: ADD_SYLLABLE, payload: syllable })
    expect(withItem.syllables[0][0]).toHaveLength(1)
    expect(withItem.past).toHaveLength(1)
    const undone = paperReducer(withItem, { type: UNDO })
    expect(undone.syllables[0][0]).toHaveLength(0)
    expect(undone.past).toHaveLength(0)
  })

  it('SET_SYLLABLES with skipHistory does not push past', () => {
    const pages = [[[{ type: 'KRUK', value: 'x', text: 'х' }]]]
    const state = paperReducer(baseState, {
      type: SET_SYLLABLES,
      payload: pages,
      meta: { skipHistory: true },
    })
    expect(state.syllables).toEqual(pages)
    expect(state.past || []).toHaveLength(0)
  })

  it('copy / cut / paste selection range', () => {
    const a = { type: 'KRUK', value: 'a', text: 'а' }
    const b = { type: 'KRUK', value: 'b', text: 'б' }
    const c = { type: 'KRUK', value: 'c', text: 'в' }
    let state = {
      ...baseState,
      syllables: [[[a, b, c]]],
      caretIndex: 3,
      past: [],
      selection: null,
      clipboard: null,
    }
    state = paperReducer(state, {
      type: SET_SELECTION,
      payload: {
        pageIndex: 0, paragraphIndex: 0, anchor: 0, focus: 2,
      },
    })
    expect(state.selection.start).toBe(0)
    expect(state.selection.end).toBe(2)

    state = paperReducer(state, { type: COPY_SELECTION })
    expect(state.clipboard).toEqual([a, b])
    expect(state.syllables[0][0]).toHaveLength(3)

    state = paperReducer(state, {
      type: SET_SELECTION,
      payload: {
        pageIndex: 0, paragraphIndex: 0, anchor: 0, focus: 2,
      },
    })
    state = paperReducer(state, { type: CUT_SELECTION })
    expect(state.syllables[0][0]).toEqual([c])
    expect(state.clipboard).toEqual([a, b])
    expect(state.caretIndex).toBe(0)
    expect(state.selection).toBe(null)

    state = paperReducer(state, { type: PASTE_CLIPBOARD })
    expect(state.syllables[0][0].map(s => s.value)).toEqual(['a', 'b', 'c'])
    expect(state.caretIndex).toBe(2)
  })

  it('DELETE_SELECTION removes range without clipboard', () => {
    const a = { type: 'KRUK', value: 'a', text: 'а' }
    const b = { type: 'KRUK', value: 'b', text: 'б' }
    let state = {
      ...baseState,
      syllables: [[[a, b]]],
      caretIndex: 2,
      past: [],
      selection: null,
      clipboard: null,
    }
    state = paperReducer(state, {
      type: SET_SELECTION,
      payload: {
        pageIndex: 0, paragraphIndex: 0, anchor: 0, focus: 1,
      },
    })
    state = paperReducer(state, { type: DELETE_SELECTION })
    expect(state.syllables[0][0]).toEqual([b])
    expect(state.clipboard).toBe(null)
    expect(state.caretIndex).toBe(0)
  })

  it('EXTEND_SELECTION sets caret and selection together', () => {
    const a = { type: 'KRUK', value: 'a', text: 'а' }
    const b = { type: 'KRUK', value: 'b', text: 'б' }
    const start = {
      ...baseState,
      syllables: [[[a, b]]],
      caretIndex: 0,
      past: [],
      selection: null,
    }
    const state = paperReducer(start, {
      type: EXTEND_SELECTION,
      payload: {
        pageIndex: 0, paragraphIndex: 0, caretIndex: 2, anchor: 0,
      },
    })
    expect(state.caretIndex).toBe(2)
    expect(state.selection).toEqual({
      pageIndex: 0,
      paragraphIndex: 0,
      anchor: 0,
      focus: 2,
      start: 0,
      end: 2,
    })
  })
})
