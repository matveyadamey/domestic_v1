import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import EditButtons from '../../components/EditButtons'
import MusicStaff from '../../components/MusicStaff'
import InsertCaret from '../../components/InsertCaret'
import { resolveNotesData } from '../../utils/resolveNotes'
import {
  editText,
  changePage,
  changeParagraph,
  setInsertCaret,
  addSyllable,
} from '../../actions'

import './style.css'

function plainTextFromHtml(html) {
  if (html == null || html === '') return ''
  const raw = String(html)
  if (raw.indexOf('<') === -1) return raw
  if (typeof document === 'undefined') {
    return raw.replace(/<[^>]+>/g, '')
  }
  const el = document.createElement('div')
  el.innerHTML = raw
  return el.textContent || el.innerText || ''
}

function isPlaceholderDash(text) {
  const t = plainTextFromHtml(text).trim()
  return t === '' || t === '-' || t === '–' || t === '—'
}

function placeCaretAtEnd(node) {
  if (!node || typeof window === 'undefined') return
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(node)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

class Syllable extends Component {
  state = {
    editing: false,
  }

  editRef = null

  skipNextCommit = false

  componentDidUpdate(prevProps, prevState) {
    if (this.state.editing && !prevState.editing && this.editRef) {
      // Melisma placeholder «-» is not real text — start empty so typing replaces it
      const plain = plainTextFromHtml(this.props.text)
      this.editRef.textContent = isPlaceholderDash(plain) ? '' : plain
      this.editRef.focus()
      placeCaretAtEnd(this.editRef)
    }
  }

  startEdit = (e) => {
    if (this.state.editing) return
    e.stopPropagation()
    e.preventDefault()
    const { actions, index, pageIndex, paragraphIndex } = this.props
    // Mark this underlay as insert position (bucvica goes before this kruk)
    actions.setInsertCaret(pageIndex, paragraphIndex, index)
    this.setState({ editing: true })
  }

  readDraft = () => {
    if (!this.editRef) return ''
    return (this.editRef.textContent || '').replace(/\u00a0/g, ' ')
  }

  commitEdit = () => {
    if (this.skipNextCommit) {
      this.skipNextCommit = false
      return
    }
    if (!this.state.editing) return
    const { actions, index, pageIndex, paragraphIndex, text } = this.props
    let draft = this.readDraft().trim()
    const prev = plainTextFromHtml(text)
    // Cleared underlay → melisma placeholder «-»
    if (draft === '') {
      draft = '-'
    }
    this.setState({ editing: false })
    if (draft === prev || (isPlaceholderDash(draft) && isPlaceholderDash(prev))) return
    actions.editText({
      text: draft,
      index,
      pageIndex,
      paragraphIndex,
    })
  }

  cancelEdit = () => {
    if (!this.state.editing) return
    this.skipNextCommit = true
    this.setState({ editing: false })
  }

  /**
   * Insert drop capital before this kruk from the letter typed in underlay.
   * Single letter + Enter, or Ctrl/Cmd+Enter while editing.
   */
  insertBucvicaFromUnderlay = () => {
    const { actions, index, pageIndex, paragraphIndex } = this.props
    const draft = this.readDraft().trim()
    if (!draft) return
    const letter = draft.charAt(0).toUpperCase()
    const rest = draft.slice(1).trim()
    this.skipNextCommit = true
    this.setState({ editing: false })
    actions.addSyllable(
      { value: '', text: letter, type: 'BUCVICA' },
      { pageIndex, paragraphIndex, caretIndex: index },
    )
    // After bucvica insert, this kruk shifts to index+1; keep remaining letters or «-»
    actions.editText({
      text: rest || '-',
      index: index + 1,
      pageIndex,
      paragraphIndex,
    })
  }

  onEditKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      e.stopPropagation()
      this.insertBucvicaFromUnderlay()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      // One letter in the underlay → drop capital (common insert path)
      const draft = this.readDraft().trim()
      if (draft.length === 1) {
        this.insertBucvicaFromUnderlay()
        return
      }
      this.commitEdit()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      this.cancelEdit()
      return
    }
    // If a dash somehow remained, first typed character replaces it
    if (
      this.editRef
      && isPlaceholderDash(this.editRef.textContent)
      && e.key.length === 1
      && !e.ctrlKey
      && !e.metaKey
      && !e.altKey
    ) {
      this.editRef.textContent = ''
      placeCaretAtEnd(this.editRef)
    }
  }

  placeCaret = (e) => {
    if (e.target.closest && e.target.closest('.syllable-button')) return
    if (e.target.closest && e.target.closest('.text')) return
    e.stopPropagation()
    const { actions, index, pageIndex, paragraphIndex } = this.props
    actions.setInsertCaret(pageIndex, paragraphIndex, index + 1)
  }

  render() {
    const {
      form, value, text, index, pageIndex, paragraphIndex, notes, notesFixed, name, pitch, opts,
      prevNotes, prevPitch, nextNotes, nextPitch,
      showCaretBefore,
    } = this.props
    const notesData = resolveNotesData({
      notes, notesFixed, value, name, pitch, opts, prevNotes, prevPitch, nextNotes, nextPitch,
    })
    const { showDvoeznamennik } = this.props
    const wideNotes = showDvoeznamennik && notesData.length >= 2
    const values = form && form.paperStyle && form.paperStyle.values
    const fontSize = (values && values.fontSize) || 40
    const textSize = (values && values.textSize) || 16
    const { editing } = this.state

    return (
      <div
        className={`syllable size${fontSize} textSize${textSize}${wideNotes ? ' syllable--wide-notes' : ''}`}
        data-paginate-item="1"
        data-page={pageIndex}
        data-paragraph={paragraphIndex}
        data-index={index}
        onClick={this.placeCaret}
      >
        {showCaretBefore && !editing ? <InsertCaret active /> : null}
        <div className="symbol" dangerouslySetInnerHTML={{ __html: value }} />
        {showDvoeznamennik ? (
          <MusicStaff notesData={notesData} />
        ) : null}
        <div
          className={`text${editing ? ' text--editing' : ''}`}
          onClick={this.startEdit}
          title="Клик — править текст; одна буква + Enter — буквица"
        >
          {editing ? (
            <span
              ref={(el) => { this.editRef = el }}
              className="syllable-text-edit"
              contentEditable
              suppressContentEditableWarning
              onKeyDown={this.onEditKeyDown}
              onBlur={this.commitEdit}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span dangerouslySetInnerHTML={{ __html: text }} />
          )}
        </div>
        <EditButtons index={index} pageIndex={pageIndex} paragraphIndex={paragraphIndex} />
      </div>
    )
  }
}

const mapStateToProps = state => ({
  form: state.form,
  showDvoeznamennik: state.paper.showDvoeznamennik,
})

const mapDispatchToProps = dispatch => (
  { actions: bindActionCreators({
    editText,
    changePage,
    changeParagraph,
    setInsertCaret,
    addSyllable,
  }, dispatch) }
)

export default connect(mapStateToProps, mapDispatchToProps)(Syllable)

Syllable.propTypes = {
  form: PropTypes.object,
  actions: PropTypes.object,
  value: PropTypes.string,
  text: PropTypes.string,
  index: PropTypes.number,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  notes: PropTypes.string,
  notesFixed: PropTypes.bool,
  name: PropTypes.string,
  pitch: PropTypes.string,
  opts: PropTypes.array,
  prevNotes: PropTypes.string,
  prevPitch: PropTypes.string,
  nextNotes: PropTypes.string,
  nextPitch: PropTypes.string,
  showDvoeznamennik: PropTypes.bool,
  showCaretBefore: PropTypes.bool,
}
