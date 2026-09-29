import { dropRight, isNil, clone } from 'lodash'
import {
  ADD_SYLLABLE,
  CHANGE_SYLLABLE,
  SET_SYLLABLES,
  REMOVE_LAST_SYLLABLE,
  REMOVE_SYLLABLE_BY_INDEX,
  REPEAT_SYLLABLE_BY_INDEX,
  SHOW_MODAL_INSERT,
  SHOW_MODAL_EDIT,
  HIDE_MODAL,
  INSERT_SYLLABLE,
  SHOW_MODAL_EDIT_TEXT,
  HIDE_MODAL_EDIT_TEXT,
  EDIT_TEXT,
  ADD_PAGE,
  CHANGE_PAGE,
  REMOVE_PAGE,
  CHANGE_PARAGRAPH,
  DELETE_PARAGRAPH,
  HIDE_MODAL_DELETE_PARAGRAPH,
  SHOW_MODAL_DELETE_PARAGRAPH,
  CHECK_PARAGRAPH_IS_EMPTY,
  TOGGLE_SHOW_PAGINATION,
  TOGGLE_SHOW_DVOEZNAMENNIK,
  SET_INSERT_CARET,
  TOGGLE_MODAL_DELETE_PAGE,
  UNDO,
  SET_SELECTION,
  CLEAR_SELECTION,
  EXTEND_SELECTION,
  COPY_SELECTION,
  CUT_SELECTION,
  PASTE_CLIPBOARD,
  DELETE_SELECTION,
} from '../constants/'
import {
  flattenToOnePage,
  normalizeSyllables,
  mergeMelismaParagraphs,
} from '../utils/paginateOverflow'

const HISTORY_LIMIT = 50

const UNDOABLE = {
  [ADD_SYLLABLE]: true,
  [REMOVE_LAST_SYLLABLE]: true,
  [REMOVE_SYLLABLE_BY_INDEX]: true,
  [REPEAT_SYLLABLE_BY_INDEX]: true,
  [INSERT_SYLLABLE]: true,
  [CHANGE_SYLLABLE]: true,
  [EDIT_TEXT]: true,
  [SET_SYLLABLES]: true,
  [ADD_PAGE]: true,
  [REMOVE_PAGE]: true,
  [DELETE_PARAGRAPH]: true,
  [CHECK_PARAGRAPH_IS_EMPTY]: true,
  [TOGGLE_SHOW_DVOEZNAMENNIK]: true,
  [CUT_SELECTION]: true,
  [PASTE_CLIPBOARD]: true,
  [DELETE_SELECTION]: true,
}

export const normalizeSelection = (selection) => {
  if (!selection) return null
  const {
    pageIndex, paragraphIndex, anchor, focus,
  } = selection
  if (pageIndex == null || paragraphIndex == null || anchor == null || focus == null) {
    return null
  }
  const start = Math.min(anchor, focus)
  const end = Math.max(anchor, focus)
  if (start === end) return null
  return {
    pageIndex, paragraphIndex, anchor, focus, start, end,
  }
}

const cloneDeep = value => JSON.parse(JSON.stringify(value))

const takeSnapshot = state => ({
  // Deep clone — many reducers mutate page arrays in place via shallow Array.from
  syllables: cloneDeep(state.syllables),
  currentPageNum: state.currentPageNum,
  currentParagraphNum: state.currentParagraphNum,
  caretIndex: state.caretIndex,
})

const pushPast = (state) => {
  const past = Array.isArray(state.past) ? state.past.slice() : []
  past.push(takeSnapshot(state))
  if (past.length > HISTORY_LIMIT) past.shift()
  return past
}

const getSelectionSlice = (state) => {
  const sel = normalizeSelection(state.selection)
  if (!sel) return null
  const page = state.syllables[sel.pageIndex]
  const para = page && page[sel.paragraphIndex]
  if (!Array.isArray(para) || sel.start < 0 || sel.end > para.length) return null
  return {
    sel,
    items: cloneDeep(para.slice(sel.start, sel.end)),
  }
}

const removeSelectionRange = (state) => {
  const packed = getSelectionSlice(state)
  if (!packed) return null
  const { sel, items } = packed
  const pages = cloneDeep(state.syllables)
  const para = pages[sel.pageIndex][sel.paragraphIndex]
  para.splice(sel.start, sel.end - sel.start)
  pages[sel.pageIndex][sel.paragraphIndex] = para
  return {
    items,
    syllables: pages,
    currentPageNum: sel.pageIndex,
    currentParagraphNum: sel.paragraphIndex,
    caretIndex: sel.start,
  }
}

let document = [[]]
if (!isNil(localStorage.getItem('pages'))) {
  document = JSON.parse(localStorage.getItem('pages'))
}

const storedDvoeznamennik = localStorage.getItem('showDvoeznamennik')
const initialShowDvoeznamennik = storedDvoeznamennik === null
  ? true
  : storedDvoeznamennik === 'true'

const initialState = {
  syllables: document,
  currentPageNum: document.length === 0 ? 0 : document.length - 1,
  currentParagraphNum: isNil(document[document.length - 1]) ? 0 : document[document.length - 1].length === 0 ? 0 : document[document.length - 1].length - 1, // eslint-disable-line
  showPagination: true,
  showDvoeznamennik: initialShowDvoeznamennik,
  caretIndex: null,
  showModalDeletePage: false,
  past: [],
  selection: null,
  clipboard: null,
}

const paperReduceCore = (state = initialState, action) => {
  const { syllables, currentPageNum, currentParagraphNum } = state
  const currentPageSyllables = state.syllables[currentPageNum] // current page
  let currentParagraph = []
  if (!isNil(currentPageSyllables)) {
    currentParagraph = currentPageSyllables[currentParagraphNum]
  }


  switch (action.type) {
    case ADD_SYLLABLE: {
      const raw = action.payload || {}
      // Support { syllable, pageIndex, paragraphIndex, caretIndex } or plain syllable
      const hasNested = raw.syllable && typeof raw.syllable === 'object'
      const syllable = hasNested ? raw.syllable : raw
      const pageIdx = hasNested && raw.pageIndex != null ? raw.pageIndex : currentPageNum
      const paraIdx = hasNested && raw.paragraphIndex != null ? raw.paragraphIndex : currentParagraphNum
      const page = syllables[pageIdx]
      const para = page && page[paraIdx]
      const base = isNil(para) ? [] : Array.from(para)
      const len = base.length
      let at = hasNested && raw.caretIndex != null ? raw.caretIndex : state.caretIndex
      if (isNil(at) || at < 0 || at > len) {
        at = len
      }
      base.splice(at, 0, syllable)
      const newSyllables = Array.from(syllables)
      if (!newSyllables[pageIdx]) {
        newSyllables[pageIdx] = []
      } else {
        newSyllables[pageIdx] = Array.from(newSyllables[pageIdx] || [])
      }
      // Ensure paragraph slot exists
      while (newSyllables[pageIdx].length <= paraIdx) {
        newSyllables[pageIdx].push([])
      }
      newSyllables[pageIdx][paraIdx] = base
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      return {
        ...state,
        syllables: newSyllables,
        currentPageNum: pageIdx,
        currentParagraphNum: paraIdx,
        caretIndex: at + 1,
      }
    }

    case REMOVE_LAST_SYLLABLE: {
      const paragraphDropRight = dropRight(currentParagraph)
      const newSyllables = Array.from(syllables)
      newSyllables[currentPageNum] = Array.from(newSyllables[currentPageNum] || [])
      newSyllables[currentPageNum][currentParagraphNum] = paragraphDropRight
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      return {
        ...state,
        syllables: newSyllables,
      }
    }

    case REMOVE_SYLLABLE_BY_INDEX: {
      const payload = action.payload || {}
      const index = typeof action.payload === 'number' ? action.payload : payload.index
      const pageIdx = payload.pageIndex != null ? payload.pageIndex : currentPageNum
      const paraIdx = payload.paragraphIndex != null ? payload.paragraphIndex : currentParagraphNum
      const page = syllables[pageIdx]
      const para = page && page[paraIdx]
      if (index == null || !Array.isArray(para) || !para[index]) {
        return state
      }
      const newPara = Array.from(para)
      newPara.splice(index, 1)
      const newSyllables = Array.from(syllables)
      newSyllables[pageIdx] = Array.from(page)
      newSyllables[pageIdx][paraIdx] = newPara
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      // Keep caret in the gap where the item was removed
      let nextCaret = index
      if (nextCaret > newPara.length) nextCaret = newPara.length
      return {
        ...state,
        syllables: newSyllables,
        currentPageNum: pageIdx,
        currentParagraphNum: paraIdx,
        caretIndex: nextCaret,
      }
    }

    case REPEAT_SYLLABLE_BY_INDEX: {
      const index = action.payload
      const syllableToRepeat = clone(currentParagraph[index])
      // make new array with repeated syllable
      const newSyllablesWithRepeat = [...currentParagraph, syllableToRepeat]
      const newSyllables = Array.from(syllables)
      newSyllables[currentPageNum] = Array.from(newSyllables[currentPageNum] || [])
      newSyllables[currentPageNum][currentParagraphNum] = newSyllablesWithRepeat
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      return {
        ...state,
        syllables: newSyllables,
      }
    }

    case SHOW_MODAL_EDIT: {
      const editableSyllable = action.payload
      return {
        ...state,
        showModalEdit: true,
        editableSyllable,
      }
    }

    case SHOW_MODAL_INSERT: {
      const indexToInsert = action.payload
      return {
        ...state,
        showModalEdit: true,
        indexToInsert,
      }
    }

    case HIDE_MODAL: {
      return {
        ...state,
        showModalEdit: false,
        editableSyllable: null,
        indexToInsert: null,
      }
    }

    case SHOW_MODAL_EDIT_TEXT : {
      const indexOfEditableText = action.payload
      return {
        ...state,
        showModalEditText: true,
        indexOfEditableText,
      }
    }

    case HIDE_MODAL_EDIT_TEXT : {
      return {
        ...state,
        showModalEditText: false,
        indexOfEditableText: null,

      }
    }

    case INSERT_SYLLABLE: {
      const { index, syllable } = action.payload
      const currentParagraphWithInsert = Array.from(currentParagraph)
      const afterIndex = parseInt(index, 10) + 1
      currentParagraphWithInsert.splice(afterIndex, 0, syllable)
      const newSyllables = Array.from(syllables)
      newSyllables[currentPageNum] = Array.from(newSyllables[currentPageNum] || [])
      newSyllables[currentPageNum][currentParagraphNum] = currentParagraphWithInsert
      localStorage.setItem('pages', JSON.stringify(newSyllables))

      return {
        ...state,
        syllables: newSyllables,
        caretIndex: afterIndex + 1,
      }
    }

    case CHANGE_SYLLABLE: {
      const { indexOfChangingSyllable, syllable } = action.payload
      const currentParagraphWithChange = Array.from(currentParagraph)
      currentParagraphWithChange[indexOfChangingSyllable] = syllable
      const newSyllables = Array.from(syllables)
      newSyllables[currentPageNum] = Array.from(newSyllables[currentPageNum] || [])
      newSyllables[currentPageNum][currentParagraphNum] = currentParagraphWithChange
      localStorage.setItem('pages', JSON.stringify(newSyllables))

      return {
        ...state,
        syllables: newSyllables,
      }
    }

    case EDIT_TEXT: {
      const payload = action.payload || {}
      const newText = payload.text
      const editIndex = payload.index != null ? payload.index : state.indexOfEditableText
      const pageIdx = payload.pageIndex != null ? payload.pageIndex : currentPageNum
      const paraIdx = payload.paragraphIndex != null ? payload.paragraphIndex : currentParagraphNum
      const page = syllables[pageIdx]
      const para = page && page[paraIdx]
      if (editIndex == null || !Array.isArray(para) || !para[editIndex]) {
        return {
          ...state,
          showModalEditText: false,
          indexOfEditableText: null,
        }
      }

      const newSyllables = Array.from(syllables)
      newSyllables[pageIdx] = Array.from(page)
      const nextPara = Array.from(para)
      nextPara[editIndex] = { ...para[editIndex], text: newText == null ? '' : newText }
      newSyllables[pageIdx][paraIdx] = nextPara
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      return {
        ...state,
        syllables: newSyllables,
        currentPageNum: pageIdx,
        currentParagraphNum: paraIdx,
        showModalEditText: false,
        indexOfEditableText: null,
      }
    }

    case SET_SYLLABLES: {
      const syllablesForSetting = action.payload
      localStorage.setItem('pages', JSON.stringify(syllablesForSetting))
      const pageCount = Array.isArray(syllablesForSetting) ? syllablesForSetting.length : 0
      const clampedPage = pageCount === 0
        ? 0
        : Math.min(currentPageNum, pageCount - 1)
      const page = pageCount > 0 ? syllablesForSetting[clampedPage] : null
      const paraCount = Array.isArray(page) ? page.length : 0
      const clampedPara = paraCount === 0
        ? 0
        : Math.min(currentParagraphNum, paraCount - 1)
      const para = paraCount > 0 ? page[clampedPara] : null
      let nextCaret = state.caretIndex
      if (nextCaret != null && Array.isArray(para)) {
        nextCaret = Math.max(0, Math.min(nextCaret, para.length))
      } else if (!Array.isArray(para)) {
        nextCaret = null
      }
      return {
        ...state,
        syllables: syllablesForSetting,
        currentPageNum: clampedPage,
        currentParagraphNum: clampedPara,
        caretIndex: nextCaret,
      }
    }

    case ADD_PAGE: {
      let newPageNum = currentPageNum + 1

      if (syllables.length === 0) { // if first page
        newPageNum = 0
      }

      return {
        ...state,
        currentPageNum: newPageNum,
        syllables: [...syllables, []],
        currentParagraphNum: 0, //  to start on new page from first paragraph

      }
    }

    case CHANGE_PAGE: {
      const pageIndex = action.payload

      return {
        ...state,
        currentPageNum: pageIndex,
        caretIndex: null,
      }
    }

    case CHANGE_PARAGRAPH: {
      const paragraphIndex = action.payload
      const same = paragraphIndex === currentParagraphNum
      return {
        ...state,
        currentParagraphNum: paragraphIndex,
        // Keep caret when re-clicking the active paragraph (syllable click stops bubble;
        // empty-area click on same para should not wipe a just-set caret from race)
        caretIndex: same ? state.caretIndex : null,
      }
    }

    case SET_INSERT_CARET: {
      const { pageIndex, paragraphIndex, caretIndex } = action.payload
      return {
        ...state,
        currentPageNum: pageIndex,
        currentParagraphNum: paragraphIndex,
        caretIndex,
        selection: null,
      }
    }

    case REMOVE_PAGE: {
      const pageIndex = action.payload

      const newSyllables = Array.from(syllables)
      newSyllables.splice(pageIndex, 1)
      localStorage.setItem('pages', JSON.stringify(newSyllables))

      if (pageIndex === currentPageNum) { // if you delete active page
        return {
          ...state,
          syllables: newSyllables,
          currentPageNum: pageIndex - 1,
        }
      }
      return {
        ...state,
        syllables: newSyllables,
      }
    }

    case DELETE_PARAGRAPH: {
      const paragraphIndex = action.payload
      const newSyllables = Array.from(syllables)
      const page = Array.isArray(newSyllables[currentPageNum])
        ? Array.from(newSyllables[currentPageNum])
        : []
      page.splice(paragraphIndex, 1)
      newSyllables[currentPageNum] = page
      localStorage.setItem('pages', JSON.stringify(newSyllables))

      const nextPara = page.length === 0
        ? 0
        : Math.min(currentParagraphNum, page.length - 1)

      return {
        ...state,
        syllables: newSyllables,
        currentParagraphNum: nextPara,
        caretIndex: null,
      }
    }

    case SHOW_MODAL_DELETE_PARAGRAPH: {
      const indexOfDeletingParagraph = action.payload
      return {
        ...state,
        showModalDeleteParagraph: true,
        indexOfDeletingParagraph,
      }
    }

    case HIDE_MODAL_DELETE_PARAGRAPH: {
      return {
        ...state,
        showModalDeleteParagraph: false,
        indexOfDeletingParagraph: null,

      }
    }

    case CHECK_PARAGRAPH_IS_EMPTY: {
      if (currentParagraph.length === 0) { // isNil?
        const newSyllables = Array.from(syllables)
        newSyllables[currentPageNum].splice(currentParagraphNum, 1)
        localStorage.setItem('pages', JSON.stringify(newSyllables))

        return {
          ...state,
          syllables: newSyllables,
        }
      }
      return state
    }

    case TOGGLE_SHOW_PAGINATION: {
      const { showPagination } = state
      if (showPagination) {
        return {
          ...state,
          showPagination: false,
        }
      }
      return {
        ...state,
        showPagination: true,
      }
    }

    case TOGGLE_SHOW_DVOEZNAMENNIK: {
      const next = !state.showDvoeznamennik
      localStorage.setItem('showDvoeznamennik', String(next))
      // Staff on/off changes row height — collapse pages so AreaOfSymbols can re-spill
      const flat = mergeMelismaParagraphs(
        normalizeSyllables(flattenToOnePage(state.syllables)),
      )
      localStorage.setItem('pages', JSON.stringify(flat))
      return {
        ...state,
        showDvoeznamennik: next,
        syllables: flat,
        currentPageNum: 0,
        currentParagraphNum: 0,
        caretIndex: null,
      }
    }

    case TOGGLE_MODAL_DELETE_PAGE: {
      const indexOfDeletingPage = action.payload
      console.log(state.showModalDeletePage)
      if (state.showModalDeletePage) {
        return {
          ...state,
          showModalDeletePage: false,
          indexOfDeletingPage: null,
        }
      }
      return {
        ...state,
        showModalDeletePage: true,
        indexOfDeletingPage,
      }
    }

    case SET_SELECTION: {
      return {
        ...state,
        selection: normalizeSelection(action.payload),
      }
    }

    case CLEAR_SELECTION: {
      return {
        ...state,
        selection: null,
      }
    }

    case EXTEND_SELECTION: {
      const {
        pageIndex, paragraphIndex, caretIndex, anchor,
      } = action.payload || {}
      return {
        ...state,
        currentPageNum: pageIndex,
        currentParagraphNum: paragraphIndex,
        caretIndex,
        selection: normalizeSelection({
          pageIndex,
          paragraphIndex,
          anchor,
          focus: caretIndex,
        }),
      }
    }

    case COPY_SELECTION: {
      const packed = getSelectionSlice(state)
      if (!packed) return state
      return {
        ...state,
        clipboard: packed.items,
      }
    }

    case CUT_SELECTION: {
      const removed = removeSelectionRange(state)
      if (!removed) return state
      localStorage.setItem('pages', JSON.stringify(removed.syllables))
      return {
        ...state,
        syllables: removed.syllables,
        clipboard: removed.items,
        currentPageNum: removed.currentPageNum,
        currentParagraphNum: removed.currentParagraphNum,
        caretIndex: removed.caretIndex,
        selection: null,
      }
    }

    case DELETE_SELECTION: {
      const removed = removeSelectionRange(state)
      if (!removed) return state
      localStorage.setItem('pages', JSON.stringify(removed.syllables))
      return {
        ...state,
        syllables: removed.syllables,
        currentPageNum: removed.currentPageNum,
        currentParagraphNum: removed.currentParagraphNum,
        caretIndex: removed.caretIndex,
        selection: null,
      }
    }

    case PASTE_CLIPBOARD: {
      const clip = state.clipboard
      if (!Array.isArray(clip) || !clip.length) return state
      const pageIdx = currentPageNum
      const paraIdx = currentParagraphNum
      const page = syllables[pageIdx]
      const para = page && page[paraIdx]
      const base = isNil(para) ? [] : Array.from(para)
      let at = state.caretIndex
      if (isNil(at) || at < 0 || at > base.length) at = base.length
      const insert = cloneDeep(clip)
      const nextPara = base.slice(0, at).concat(insert, base.slice(at))
      const newSyllables = Array.from(syllables)
      if (!newSyllables[pageIdx]) newSyllables[pageIdx] = []
      else newSyllables[pageIdx] = Array.from(newSyllables[pageIdx] || [])
      while (newSyllables[pageIdx].length <= paraIdx) {
        newSyllables[pageIdx].push([])
      }
      newSyllables[pageIdx][paraIdx] = nextPara
      localStorage.setItem('pages', JSON.stringify(newSyllables))
      return {
        ...state,
        syllables: newSyllables,
        currentPageNum: pageIdx,
        currentParagraphNum: paraIdx,
        caretIndex: at + insert.length,
        selection: null,
      }
    }

    case UNDO: {
      const past = Array.isArray(state.past) ? state.past : []
      if (!past.length) return state
      const previous = past[past.length - 1]
      const nextPast = past.slice(0, -1)
      const restored = cloneDeep(previous.syllables)
      localStorage.setItem('pages', JSON.stringify(restored))
      return {
        ...state,
        syllables: restored,
        currentPageNum: previous.currentPageNum,
        currentParagraphNum: previous.currentParagraphNum,
        caretIndex: previous.caretIndex,
        past: nextPast,
        selection: null,
      }
    }

    default:
      return state
  }
}

export default (state = initialState, action) => {
  // Selection / copy / undo handled inside core; wrap undoable syllable mutations
  if (action.type === UNDO
    || action.type === SET_SELECTION
    || action.type === CLEAR_SELECTION
    || action.type === EXTEND_SELECTION
    || action.type === COPY_SELECTION) {
    return paperReduceCore(state, action)
  }

  const next = paperReduceCore(state, action)
  if (next === state) return state

  const skipHistory = action.meta && action.meta.skipHistory
  const canUndo = UNDOABLE[action.type] && !skipHistory
  const changedDoc = next.syllables !== state.syllables
    || next.currentPageNum !== state.currentPageNum
    || next.currentParagraphNum !== state.currentParagraphNum

  if (!canUndo || !changedDoc) {
    return next
  }

  // Don't clear selection that the action itself set; clear after edits
  const clearSel = action.type !== SET_SELECTION
  return {
    ...next,
    past: pushPast(state),
    selection: clearSel ? null : next.selection,
  }
}
