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
} from '../constants/'
import {
  flattenToOnePage,
  normalizeSyllables,
  mergeMelismaParagraphs,
} from '../utils/paginateOverflow'

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
}

export default (state = initialState, action) => {
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

    default:
      return state
  }
}
