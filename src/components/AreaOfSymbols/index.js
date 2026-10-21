import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Button } from 'reactstrap'
import { isNil } from 'lodash'

import {
  moveSyllable,
  hideModal,
  changePage,
  removePage,
  addPage,
  removeSyllablebyIndex,
  changeParagraph,
  setSyllables,
  setInsertCaret,
  checkParagraphIsEmpty,
  addSyllable,
  setSelection,
  clearSelection,
  extendSelection,
  deleteSelection,
} from '../../actions'

import {
  Bucvica,
  Text,
  Syllable,
} from '../../containers'

import { Loading, getPageNum } from '../../utils'
import {
  resolveNotesString,
  resolveParagraphNotesMap,
  effectivePitchOf,
} from '../../utils/resolveNotes'
import { findSpillElement, spillSyllablesToNextPage, flattenToOnePage, normalizeSyllables, mergeMelismaParagraphs } from '../../utils/paginateOverflow'
import {
  countFittingSyllables,
  remainingWidthOnLastRow,
  syllableLayoutWidth,
  findParagraphElement,
} from '../../utils/pullToPreviousLine'
import {
  markDragSelectDone,
  paginateItemFromPoint,
  parsePaginateItem,
} from '../../utils/paperDragSelect'

import {
  RemovePageButton,
  RemoveParagraphButton,
  Paragraph,
  InsertCaret,
} from '../'

import './style.css'

class AreaOfSymbols extends Component {
  componentDidMount() {
    this.schedulePaginate()
    // Capture phase: bottom-panel inputs otherwise eat Ctrl+Z / Ctrl+C/V
    window.addEventListener('keydown', this.handlePaperKeyDown, true)
  }

  componentDidUpdate(prevProps) {
    if (this.styleLayoutChanged(prevProps, this.props)) {
      // Font / staff height change: collapse to one page, then spill again
      this.scheduleReflow()
      return
    }
    // Content change — only push overflow forward
    if (prevProps.syllables !== this.props.syllables && !this.paginating) {
      this.schedulePaginate()
    }
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handlePaperKeyDown, true)
    document.removeEventListener('mousemove', this.handlePointerSelectMove)
    document.removeEventListener('mouseup', this.handlePointerSelectEnd)
    if (this.paginateTimer) clearTimeout(this.paginateTimer)
    if (this.reflowTimer) clearTimeout(this.reflowTimer)
  }

  /** Drag across syllables to select a range (same paragraph). */
  handlePaperMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest && (
      e.target.closest('.bucvica-button')
      || e.target.closest('.text-remove-button')
      || e.target.closest('.syllable-text-edit')
    )) return
    // Plain click on underlay text still opens inline edit
    if (e.target.closest && e.target.closest('.syllable .text') && !e.shiftKey) return

    const item = e.target.closest('[data-paginate-item="1"]')
    if (!item) return

    const start = parsePaginateItem(item)
    if (!start) return

    e.preventDefault()

    this.pointerSelect = {
      pageIndex: start.pageIndex,
      paragraphIndex: start.paragraphIndex,
      startIndex: start.index,
      moved: false,
    }
    document.addEventListener('mousemove', this.handlePointerSelectMove)
    document.addEventListener('mouseup', this.handlePointerSelectEnd)
  }

  handlePointerSelectMove = (e) => {
    const ps = this.pointerSelect
    if (!ps) return

    const hover = paginateItemFromPoint(e.clientX, e.clientY)
    if (!hover
      || hover.pageIndex !== ps.pageIndex
      || hover.paragraphIndex !== ps.paragraphIndex) return

    if (hover.index !== ps.startIndex) {
      ps.moved = true
      if (this.paperAreaEl) {
        this.paperAreaEl.classList.add('is-drag-selecting')
      }
    }

    const lo = Math.min(ps.startIndex, hover.index)
    const hi = Math.max(ps.startIndex, hover.index)
    this.props.actions.extendSelection({
      pageIndex: ps.pageIndex,
      paragraphIndex: ps.paragraphIndex,
      anchor: lo,
      caretIndex: hi + 1,
    })
  }

  handlePointerSelectEnd = () => {
    document.removeEventListener('mousemove', this.handlePointerSelectMove)
    document.removeEventListener('mouseup', this.handlePointerSelectEnd)

    const ps = this.pointerSelect
    this.pointerSelect = null

    if (this.paperAreaEl) {
      this.paperAreaEl.classList.remove('is-drag-selecting')
    }

    if (ps && ps.moved) {
      markDragSelectDone()
    }
  }

  isTypingTarget = (el) => {
    if (!el || !el.tagName) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (el.isContentEditable) return true
    if (el.closest && (
      el.closest('[contenteditable="true"]')
      || el.closest('.modal')
      || el.closest('.app-menu-panel')
      || el.closest('.app-settings-panel')
    )) return true
    return false
  }

  /** Block paper nav keys only while editing underlay / modal / settings. */
  shouldIgnorePaperNav = (el) => {
    if (!el || !el.closest) return false
    if (el.closest('.syllable-text-edit')) return true
    if (el.closest('.modal')) return true
    if (el.closest('.app-menu-panel')) return true
    if (el.closest('.app-settings-panel')) return true
    return false
  }

  /** All insert slots in the paragraph (0 … length). */
  getCaretPositions = (paragraph) => {
    const len = Array.isArray(paragraph) ? paragraph.length : 0
    const positions = []
    for (let i = 0; i <= len; i += 1) positions.push(i)
    return positions
  }

  snapCaretIndex = (positions, caret) => {
    if (positions.indexOf(caret) !== -1) return caret
    for (let i = 0; i < positions.length; i += 1) {
      if (positions[i] >= caret) return positions[i]
    }
    return positions[positions.length - 1]
  }

  focusPaperArea = () => {
    if (this.paperAreaEl && typeof this.paperAreaEl.focus === 'function') {
      this.paperAreaEl.focus({ preventScroll: true })
    }
  }

  handlePaperKeyDown = (e) => {
    if (this.shouldIgnorePaperNav(e.target)) return
    // Undo / copy / cut / paste / Esc — PaperKeyboard (global, capture phase)

    const key = e.key
    const {
      syllables, currentPageNum, currentParagraphNum, caretIndex, selection, actions,
    } = this.props

    // Arrows / Backspace / Enter: don't steal from form fields
    if (this.isTypingTarget(e.target)) return

    const isArrow = key === 'ArrowLeft' || key === 'ArrowRight'
      || key === 'ArrowUp' || key === 'ArrowDown'
    const isDelete = key === 'Backspace' || key === 'Delete'
    const isEnter = key === 'Enter'
    if (!isArrow && !isDelete && !isEnter) return

    const page = syllables && syllables[currentPageNum]
    if (!page || !page.length) return
    const paragraph = page[currentParagraphNum]
    if (!Array.isArray(paragraph)) return

    const positions = this.getCaretPositions(paragraph)
    const caret = this.snapCaretIndex(
      positions,
      caretIndex == null ? paragraph.length : caretIndex,
    )

    if (isEnter) {
      e.preventDefault()
      actions.addSyllable(
        { value: '', text: '', type: 'BREAK' },
        {
          pageIndex: currentPageNum,
          paragraphIndex: currentParagraphNum,
          caretIndex: caret,
        },
      )
      return
    }

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault()
      const idx = positions.indexOf(caret)
      const nextIdx = key === 'ArrowLeft'
        ? Math.max(0, idx - 1)
        : Math.min(positions.length - 1, idx + 1)
      const nextCaret = positions[nextIdx]
      if (e.shiftKey) {
        const anchor = (selection
          && selection.pageIndex === currentPageNum
          && selection.paragraphIndex === currentParagraphNum
          && selection.anchor != null)
          ? selection.anchor
          : caret
        actions.extendSelection({
          pageIndex: currentPageNum,
          paragraphIndex: currentParagraphNum,
          caretIndex: nextCaret,
          anchor,
        })
      } else {
        actions.setInsertCaret(currentPageNum, currentParagraphNum, nextCaret)
      }
      return
    }

    if (key === 'ArrowUp') {
      e.preventDefault()
      if (currentParagraphNum > 0) {
        const prevPara = page[currentParagraphNum - 1]
        const prevPositions = this.getCaretPositions(prevPara)
        actions.setInsertCaret(
          currentPageNum,
          currentParagraphNum - 1,
          prevPositions[prevPositions.length - 1],
        )
      } else if (currentPageNum > 0) {
        const prevPage = syllables[currentPageNum - 1]
        if (!prevPage || !prevPage.length) return
        const lastParaIdx = prevPage.length - 1
        const prevPositions = this.getCaretPositions(prevPage[lastParaIdx])
        actions.setInsertCaret(
          currentPageNum - 1,
          lastParaIdx,
          prevPositions[prevPositions.length - 1],
        )
      }
      return
    }

    if (key === 'ArrowDown') {
      e.preventDefault()
      if (currentParagraphNum < page.length - 1) {
        const nextPara = page[currentParagraphNum + 1]
        const nextPositions = this.getCaretPositions(nextPara)
        actions.setInsertCaret(currentPageNum, currentParagraphNum + 1, nextPositions[0])
      } else if (currentPageNum < syllables.length - 1) {
        const nextPage = syllables[currentPageNum + 1]
        if (!nextPage || !nextPage.length) return
        const nextPositions = this.getCaretPositions(nextPage[0])
        actions.setInsertCaret(currentPageNum + 1, 0, nextPositions[0])
      }
      return
    }

    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault()
      if (selection) {
        actions.deleteSelection()
        actions.checkParagraphIsEmpty()
        return
      }
      if (key === 'Backspace') {
        if (caret <= 0) {
          this.pullSyllablesToPreviousLine()
          return
        }
        actions.removeSyllablebyIndex({
          index: caret - 1,
          pageIndex: currentPageNum,
          paragraphIndex: currentParagraphNum,
        })
        actions.checkParagraphIsEmpty()
        return
      }
      if (caret >= paragraph.length) return
      actions.removeSyllablebyIndex({
        index: caret,
        pageIndex: currentPageNum,
        paragraphIndex: currentParagraphNum,
      })
      actions.checkParagraphIsEmpty()
    }
  }

  /**
   * Backspace at start of a line/paragraph: move as many syllables as fit
   * onto the previous paragraph's last visual row.
   */
  pullSyllablesToPreviousLine = () => {
    const { syllables, currentPageNum, currentParagraphNum } = this.props
    if (!syllables || !syllables[currentPageNum]) return

    let prevPageIdx = currentPageNum
    let prevParaIdx = currentParagraphNum - 1
    if (prevParaIdx < 0) {
      if (currentPageNum <= 0) return
      prevPageIdx = currentPageNum - 1
      const prevPage = syllables[prevPageIdx]
      if (!prevPage || !prevPage.length) return
      prevParaIdx = prevPage.length - 1
    }

    const prevPara = syllables[prevPageIdx][prevParaIdx]
    const curPara = syllables[currentPageNum][currentParagraphNum]
    if (!Array.isArray(prevPara) || !Array.isArray(curPara) || !curPara.length) return

    const prevEl = findParagraphElement(prevPageIdx, prevParaIdx)
    const curEl = findParagraphElement(currentPageNum, currentParagraphNum)
    if (!prevEl || !curEl) {
      // DOM not ready — merge one syllable as fallback
      this.applyPullMove(prevPageIdx, prevParaIdx, currentPageNum, currentParagraphNum, 1)
      return
    }

    const free = remainingWidthOnLastRow(prevEl)
    const curItems = Array.from(curEl.querySelectorAll('[data-paginate-item="1"]'))
    const widths = curItems.map(syllableLayoutWidth)
    let moveCount = countFittingSyllables(widths, free)

    // Last visual row is full — pack a new row into the previous paragraph
    if (moveCount === 0) {
      const style = window.getComputedStyle(prevEl)
      const padL = parseFloat(style.paddingLeft) || 0
      const padR = parseFloat(style.paddingRight) || 0
      const full = Math.max(0, prevEl.clientWidth - padL - padR)
      moveCount = countFittingSyllables(widths, full)
    }

    // Always allow pulling at least one syllable when joining lines
    if (moveCount <= 0 && curPara.length > 0) {
      moveCount = 1
    }

    if (moveCount <= 0) return
    this.applyPullMove(prevPageIdx, prevParaIdx, currentPageNum, currentParagraphNum, moveCount)
  }

  applyPullMove = (prevPageIdx, prevParaIdx, curPageIdx, curParaIdx, moveCount) => {
    const { syllables, actions } = this.props
    const pages = JSON.parse(JSON.stringify(syllables))
    const prevPara = pages[prevPageIdx][prevParaIdx]
    const curPara = pages[curPageIdx][curParaIdx]
    if (!Array.isArray(prevPara) || !Array.isArray(curPara)) return

    const n = Math.min(moveCount, curPara.length)
    if (n <= 0) return

    const joinAt = prevPara.length
    const moved = curPara.splice(0, n)
    pages[prevPageIdx][prevParaIdx] = prevPara.concat(moved)

    if (curPara.length === 0) {
      pages[curPageIdx].splice(curParaIdx, 1)
      // Drop empty page if needed (keep at least one page)
      if (pages[curPageIdx].length === 0 && pages.length > 1) {
        pages.splice(curPageIdx, 1)
      }
    } else {
      pages[curPageIdx][curParaIdx] = curPara
    }

    actions.setSyllables(pages)
    actions.setInsertCaret(prevPageIdx, prevParaIdx, joinAt)
    // Do NOT scheduleReflow here: flatten+re-spill rebuilds paragraphs and
    // undoes the width-based pull. Page overflow is handled by the normal
    // schedulePaginate from componentDidUpdate (forward spill only).
  }

  styleLayoutChanged = (prev, next) => {
    const prevVals = prev.form && prev.form.paperStyle && prev.form.paperStyle.values
    const nextVals = next.form && next.form.paperStyle && next.form.paperStyle.values
    const prevFont = prevVals && prevVals.fontSize
    const nextFont = nextVals && nextVals.fontSize
    const prevText = prevVals && prevVals.textSize
    const nextText = nextVals && nextVals.textSize
    const prevLineText = prevVals && prevVals.lineTextSize
    const nextLineText = nextVals && nextVals.lineTextSize
    const prevNotes = prevVals && prevVals.notesSize
    const nextNotes = nextVals && nextVals.notesSize
    const prevGap = prevVals && prevVals.staffTextGap
    const nextGap = nextVals && nextVals.staffTextGap
    const prevTitleGap = prevVals && prevVals.titleBannersGap
    const nextTitleGap = nextVals && nextVals.titleBannersGap
    // sizeOfBucvica is out-of-flow (absolute) — do not paginate on it
    if (
      prevFont !== nextFont
      || prevText !== nextText
      || prevLineText !== nextLineText
      || prevNotes !== nextNotes
      || prevGap !== nextGap
      || prevTitleGap !== nextTitleGap
    ) return true
    if (prev.showDvoeznamennik !== next.showDvoeznamennik) return true
    return false
  }

  schedulePaginate = () => {
    if (this.paginating) return
    if (this.paginateTimer) clearTimeout(this.paginateTimer)
    this.paginateTimer = setTimeout(this.runPaginate, 450)
  }

  scheduleReflow = () => {
    this.pendingReflow = true
    if (this.paginating) return
    if (this.reflowTimer) clearTimeout(this.reflowTimer)
    if (this.paginateTimer) clearTimeout(this.paginateTimer)
    // Wait for staff / font size to paint before measuring
    this.reflowTimer = setTimeout(this.runReflow, 500)
  }

  finishPaginating = () => {
    this.paginating = false
    if (this.pendingCaretAfterReflow) {
      const c = this.pendingCaretAfterReflow
      this.pendingCaretAfterReflow = null
      const { actions, syllables } = this.props
      const page = syllables && syllables[c.pageIndex]
      const para = page && page[c.paragraphIndex]
      if (Array.isArray(para)) {
        const at = Math.max(0, Math.min(c.caretIndex, para.length))
        actions.setInsertCaret(c.pageIndex, c.paragraphIndex, at)
      }
    }
    if (this.pendingReflow) {
      this.scheduleReflow()
      return
    }
    this.schedulePaginate()
  }

  runReflow = () => {
    if (this.paginating) {
      this.pendingReflow = true
      return
    }
    const { syllables, actions } = this.props
    if (!Array.isArray(syllables) || !syllables.length) {
      this.pendingReflow = false
      return
    }

    const flat = mergeMelismaParagraphs(
      normalizeSyllables(flattenToOnePage(syllables)),
    )
    this.pendingReflow = false
    this.paginating = true
    // Always re-measure after layout change, even if already one page
    if (JSON.stringify(flat) !== JSON.stringify(syllables)) {
      actions.setSyllables(flat, { skipHistory: true })
    }
    setTimeout(this.finishPaginating, 450)
  }

  runPaginate = () => {
    if (this.paginating) return
    const { syllables, actions } = this.props
    if (!Array.isArray(syllables) || !syllables.length) return

    const pageEls = document.querySelectorAll('.paperArea .a4')
    let next = syllables
    let changed = false

    for (let pageIndex = 0; pageIndex < pageEls.length; pageIndex += 1) {
      const spillEl = findSpillElement(pageEls[pageIndex])
      if (!spillEl) continue

      const paragraphIndex = parseInt(spillEl.getAttribute('data-paragraph'), 10)
      const itemIndex = parseInt(spillEl.getAttribute('data-index'), 10)
      if (Number.isNaN(paragraphIndex) || Number.isNaN(itemIndex)) continue

      const spilled = spillSyllablesToNextPage(next, pageIndex, paragraphIndex, itemIndex)
      if (!spilled) continue

      // No-op guard (same structure)
      if (JSON.stringify(spilled) === JSON.stringify(next)) continue

      next = spilled
      changed = true
      break
    }

    if (changed) {
      this.paginating = true
      actions.setSyllables(next, { skipHistory: true })
      setTimeout(this.finishPaginating, 500)
    }
  }

  renderPages = () => {
    const { syllables, actions, showPagination, currentPageNum } = this.props
    let pageTemplate = null

    if (Array.isArray(syllables)) {
      pageTemplate = syllables.map((item, pageIndex) => (
        <React.Fragment key={pageIndex}>
          <div className={ pageIndex === currentPageNum ? "a4 activePage" : "a4" } onClick={() => actions.changePage(pageIndex)}>
            <RemovePageButton pageIndex={pageIndex} />
            <div className="page">
              {this.renderOnePage(item, pageIndex)}
            </div>
            <span className="pagination" style={{ display: showPagination ? 'inline' : 'none' }} dangerouslySetInnerHTML={{ __html: getPageNum(pageIndex) }} />
          </div>
        </React.Fragment>
      ))
    }
    return pageTemplate
  }

  changeParagraph = (e, paragraphIndex) => {
    const { actions } = this.props
    actions.changeParagraph(paragraphIndex)
  }

  renderOnePage = (item, pageIndex) => {
    const { currentPageNum, currentParagraphNum } = this.props
    if (!Array.isArray(item)) return null
    const syllablesTemplate = item.map((paragraph, paragraphIndex) => (
      <div className="paragraphWrapper" key={`${pageIndex}-${paragraphIndex}`}>
        <RemoveParagraphButton paragraphIndex={paragraphIndex} pageIndex={pageIndex} />
        <Paragraph
          className={pageIndex + '' + paragraphIndex === currentPageNum + '' + currentParagraphNum ? 'paragraph activeParagraph' : 'paragraph'}
          onClick={e => this.changeParagraph(e, paragraphIndex)}
          showDvoeznamennik={this.props.showDvoeznamennik}
        >
          {this.renderOneParagraph(paragraph, paragraphIndex, pageIndex)}
        </Paragraph>
      </div>
    ))
    return syllablesTemplate
  }

  /**
   * Height of leading full-width TEXT rows before the first kruk/bucvica row.
   * Bucvica is position:absolute at paragraph top — without this offset it sits
   * under the title and grows into it when size increases.
   */
  bucvicaTopOffset = (paragraph) => {
    const { form } = this.props
    const values = form && form.paperStyle && form.paperStyle.values
    const lineTextSize = Number((values && values.lineTextSize) || 24)
    const titleGapRaw = values && values.titleBannersGap
    const titleGap = titleGapRaw == null || titleGapRaw === '' ? 4 : Number(titleGapRaw)
    // Count every TEXT before the first KRUK. Bucvica is out of flex flow, so
    // it must not stop the scan — titles after the bucvica still push the kruk row down.
    let textCount = 0
    for (let i = 0; i < paragraph.length; i += 1) {
      const item = paragraph[i]
      if (!item) continue
      if (item.type === 'KRUK') break
      if (item.type === 'TEXT') textCount += 1
    }
    if (!textCount) return ''
    // .text-line: fontSize pt × lineHeight 1.25 + margin-bottom titleBannersGap
    return `calc(${textCount * lineTextSize * 1.25}pt + ${textCount * titleGap}px)`
  }

  renderOneParagraph = (paragraph, paragraphIndex, pageIndex) => {
    const { actions, currentPageNum, currentParagraphNum, caretIndex } = this.props
    if (!Array.isArray(paragraph)) return null

    const nodes = []
    const isCurrent =
      pageIndex === currentPageNum && paragraphIndex === currentParagraphNum
    const effectiveCaret = (caretIndex == null && isCurrent)
      ? paragraph.length
      : caretIndex
    const bucTopOffset = this.bucvicaTopOffset(paragraph)

    const notesMap = resolveParagraphNotesMap(paragraph)

    // Build next-kruk context (right-to-left) for Syllable live resolve
    const nextCtx = {}
    {
      let nextNotes = null
      let nextPitch = null
      for (let i = paragraph.length - 1; i >= 0; i -= 1) {
        const item = paragraph[i]
        if (!item || item.type !== 'KRUK') continue
        nextCtx[i] = { nextNotes, nextPitch }
        const notes = notesMap[i] || null
        if (notes) {
          nextNotes = notes
          nextPitch = effectivePitchOf(item, notes)
        } else if (item.pitch && item.pitch !== '-') {
          nextPitch = item.pitch
          nextNotes = null
        }
      }
    }

    let prevNotes = null
    let prevPitch = null

    paragraph.forEach((item, index) => {
      const { value, text, type } = item
      // Caret is drawn inside the item (absolute) — never as a flex sibling
      const showCaretBefore = isCurrent && effectiveCaret === index

      // Always a standalone initial — do not fold into the next kruk syllable
      if (type === 'BUCVICA') {
        nodes.push(
          <Bucvica
            text={text}
            index={parseInt(index, 10)}
            paragraphIndex={paragraphIndex}
            pageIndex={pageIndex}
            showCaretBefore={showCaretBefore}
            topOffset={bucTopOffset}
            key={`bucvica-${pageIndex}-${paragraphIndex}-${index}`}
          />
        )
        return
      }

      if (type === 'KRUK') {
        const resolvedNotes = notesMap[index] || item.notes
        const { nextNotes, nextPitch } = nextCtx[index] || {}
        nodes.push(
          <Syllable
            value={value}
            text={text}
            notes={resolvedNotes}
            notesFixed={item.notesFixed}
            name={item.name}
            pitch={item.pitch}
            opts={item.opts}
            prevNotes={prevNotes}
            prevPitch={prevPitch}
            nextNotes={nextNotes}
            nextPitch={nextPitch}
            key={parseInt(index, 10)}
            paragraphIndex={paragraphIndex}
            pageIndex={pageIndex}
            index={parseInt(index, 10)}
            showCaretBefore={showCaretBefore}
          />
        )
        prevNotes = resolveNotesString({
          notes: resolvedNotes,
          notesFixed: item.notesFixed,
          value: item.value,
          name: item.name,
          pitch: item.pitch,
          opts: item.opts,
          prevNotes,
          prevPitch,
          nextNotes,
          nextPitch,
        }) || prevNotes
        prevPitch = effectivePitchOf(item, prevNotes) || prevPitch
        return
      }

      if (type === 'BREAK') {
        nodes.push(
          <div
            className="break-wrap"
            key={`break-${index}`}
            data-page={pageIndex}
            data-paragraph={paragraphIndex}
            data-index={index}
            onClick={(e) => {
              e.stopPropagation()
              actions.setInsertCaret(pageIndex, paragraphIndex, index + 1)
            }}
          >
            {showCaretBefore ? <InsertCaret active /> : null}
            <hr className="break" />
          </div>
        )
        return
      }

      if (type === 'TEXT') {
        nodes.push(
          <Text
            text={text}
            pageIndex={pageIndex}
            paragraphIndex={paragraphIndex}
            index={parseInt(index, 10)}
            setInsertCaret={actions.setInsertCaret}
            showCaretBefore={showCaretBefore}
            key={parseInt(`${pageIndex}${paragraphIndex}${index}`, 10)}
          />
        )
      }
    })

    // Caret after the last item — zero-width marker, not a flex gap
    if (isCurrent && effectiveCaret === paragraph.length) {
      nodes.push(
        <span className="insert-caret-end" key={`caret-end-${pageIndex}-${paragraphIndex}`}>
          <InsertCaret active />
        </span>
      )
    }

    return nodes
  }

  render() {
    const { form, actions } = this.props

    if (isNil(form.paperStyle)) {
      return <Loading />
    }

    const notesSize = (form.paperStyle.values && form.paperStyle.values.notesSize) || 100
    const notesScale = Number(notesSize) / 100
    const staffTextGap = form.paperStyle.values && form.paperStyle.values.staffTextGap
    const gap = staffTextGap == null || staffTextGap === '' ? 16 : Number(staffTextGap)
    const titleBannersGap = form.paperStyle.values && form.paperStyle.values.titleBannersGap
    const titleGap = titleBannersGap == null || titleBannersGap === '' ? 4 : Number(titleBannersGap)

    return (
      <div
        className="paperArea"
        tabIndex={-1}
        ref={(el) => { this.paperAreaEl = el }}
        onMouseDown={(e) => {
          this.handlePaperMouseDown(e)
          if (this.isTypingTarget(e.target)) return
          if (e.target.closest && e.target.closest('.bucvica-button')) return
          this.focusPaperArea()
        }}
        style={{
          '--notes-scale': notesScale,
          '--staff-text-gap': gap,
          '--title-banners-gap': titleGap,
        }}
      >
          <div className="areaOfSymbols mx-auto">
            <div className="paperMargin" >
              {this.renderPages()}
              <Button
                color="primary"
                className="add-page"
                onClick={actions.addPage}
              >
                Добавить страницу
              </Button>
            </div>
          </div>
      </div>
    )
  }
}

AreaOfSymbols.propTypes = {
  syllables: PropTypes.array,
  form: PropTypes.object,
  actions: PropTypes.object,
  showPagination: PropTypes.bool,
  showDvoeznamennik: PropTypes.bool,
  caretIndex: PropTypes.number,
  currentPageNum: PropTypes.number,
  currentParagraphNum: PropTypes.number,
  selection: PropTypes.object,
}

const mapDispatchToProps = dispatch => (
  { actions: bindActionCreators({
    moveSyllable,
    hideModal,
    changePage,
    removePage,
    addPage,
    removeSyllablebyIndex,
    changeParagraph,
    setSyllables,
    setInsertCaret,
    checkParagraphIsEmpty,
    addSyllable,
    setSelection,
    clearSelection,
    extendSelection,
    deleteSelection,
  }, dispatch) }
)

const mapStateToProps = state => ({
  syllables: state.paper.syllables,
  form: state.form,
  showModalEdit: state.paper.showModalEdit,
  showModalEditText: state.paper.showModalEditText,
  currentPageNum: state.paper.currentPageNum,
  currentParagraphNum: state.paper.currentParagraphNum,
  showPagination: state.paper.showPagination,
  showDvoeznamennik: state.paper.showDvoeznamennik,
  caretIndex: state.paper.caretIndex,
  selection: state.paper.selection,
})

export default connect(mapStateToProps, mapDispatchToProps)(AreaOfSymbols)