import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import './style.css'

import { changeParagraph, addSyllable } from '../../actions'

class InsertText extends Component {
  constructor(props) {
    super(props)
    this.bucvicaInput = null
    this.textInput = null
  }

  preventSubmit = (e) => {
    e.preventDefault()
  }

  insertBucvica = () => {
    const input = this.bucvicaInput
    if (!input) return
    const raw = (input.value || '').trim()
    if (!raw) return
    const value = raw.charAt(0).toUpperCase()
    const {
      actions, currentPageNum, currentParagraphNum, caretIndex, syllables,
    } = this.props

    const pageIndex = currentPageNum == null ? 0 : currentPageNum
    const paragraphIndex = currentParagraphNum == null ? 0 : currentParagraphNum
    // Create page slot if document has no pages yet
    if (!syllables || !syllables.length) {
      actions.addSyllable(
        { value: '', text: value, type: 'BUCVICA' },
        { pageIndex: 0, paragraphIndex: 0, caretIndex: 0 },
      )
    } else {
      actions.addSyllable(
        { value: '', text: value, type: 'BUCVICA' },
        {
          pageIndex,
          paragraphIndex,
          caretIndex: caretIndex == null ? undefined : caretIndex,
        },
      )
    }
    input.value = ''
    input.focus()
  }

  insertText = () => {
    const input = this.textInput
    if (!input) return
    const value = (input.value || '').trim()
    if (!value) return
    const {
      actions, currentPageNum, currentParagraphNum, caretIndex, syllables,
    } = this.props

    const pageIndex = currentPageNum == null ? 0 : currentPageNum
    const paragraphIndex = currentParagraphNum == null ? 0 : currentParagraphNum
    if (!syllables || !syllables.length) {
      actions.addSyllable(
        { value: '', text: value, type: 'TEXT' },
        { pageIndex: 0, paragraphIndex: 0, caretIndex: 0 },
      )
    } else {
      actions.addSyllable(
        { value: '', text: value, type: 'TEXT' },
        {
          pageIndex,
          paragraphIndex,
          caretIndex: caretIndex == null ? undefined : caretIndex,
        },
      )
    }
    input.value = ''
    input.focus()
  }

  onBucvicaKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    this.insertBucvica()
  }

  onTextKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    this.insertText()
  }

  newParagraph = () => {
    const { actions, syllables, currentPageNum, currentParagraphNum } = this.props
    if (syllables[currentPageNum][currentParagraphNum] === undefined) {
      return
    }
    const numOfLastParagraphOnPage = syllables[currentPageNum].length - 1
    const newParagraphNum = numOfLastParagraphOnPage + 1
    actions.changeParagraph(newParagraphNum)
  }

  render() {
    const { caretIndex } = this.props
    const hasCaret = caretIndex != null
    return (
      <div className="insert-text text-left">
        <h4>Вставка текста</h4>
        <form onSubmit={this.preventSubmit}>
          <div className="field field-insert-text">
            <label htmlFor="insert-text-field">Вставить текст</label>
            <div className="insert-text-row">
              <input
                id="insert-text-field"
                name="text"
                className="form-control ucs-text"
                ref={(el) => { this.textInput = el }}
                onKeyDown={this.onTextKeyDown}
              />
              <button
                type="button"
                className="btn btn-primary insert-text-btn"
                onClick={this.insertText}
              >
                Вставить
              </button>
            </div>
          </div>
        </form>
        <form onSubmit={this.preventSubmit}>
          <div className="field field-insert-bucvica">
            <label htmlFor="bucvica">Вставить буквицу</label>
            <div className="insert-text-row">
              <input
                id="bucvica"
                name="bucvica"
                className="form-control"
                ref={(el) => { this.bucvicaInput = el }}
                onKeyDown={this.onBucvicaKeyDown}
                placeholder="Буква"
              />
              <button
                type="button"
                className="btn btn-primary insert-text-btn insert-bucvica-btn"
                onClick={this.insertBucvica}
              >
                Вставить
              </button>
            </div>
            <div className="insert-bucvica-hint">
              {hasCaret
                ? 'Вставка перед выбранным слогом. Или клик по подписи → буква → Enter.'
                : 'Клик по подписи под крюком → одна буква → Enter. Или введите букву здесь и нажмите «Вставить».'}
            </div>
          </div>
        </form>
        <button
          type="button"
          className="btn btn-secondary insert-text-new-para"
          onClick={this.newParagraph}
        >
          Новый абзац
        </button>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  compositions: state.compositions,
  currentParagraphNum: state.paper.currentParagraphNum,
  currentPageNum: state.paper.currentPageNum,
  syllables: state.paper.syllables,
  caretIndex: state.paper.caretIndex,
})
const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    changeParagraph,
    addSyllable,
  },
  dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(InsertText)

InsertText.propTypes = {
  actions: PropTypes.object,
  currentParagraphNum: PropTypes.number,
  currentPageNum: PropTypes.number,
  syllables: PropTypes.array,
  caretIndex: PropTypes.number,
}
