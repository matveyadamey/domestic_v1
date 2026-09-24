import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import './style.css'

import { changeParagraph, addSyllable, toggleShowPagination } from '../../actions'

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
    const value = (input.value || '').trim()
    if (!value) return
    const { actions } = this.props
    actions.addSyllable({ value: '', text: value, type: 'BUCVICA' })
    input.value = ''
    input.focus()
  }

  insertText = () => {
    const input = this.textInput
    if (!input) return
    const value = (input.value || '').trim()
    if (!value) return
    const { actions } = this.props
    actions.addSyllable({ value: '', text: value, type: 'TEXT' })
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

  toggleShowPagination = () => {
    const { actions } = this.props
    actions.toggleShowPagination()
  }

  render() {
    return (
      <div className="insert-text text-left">
        <h4>Вставка текста</h4>
        <form onSubmit={this.preventSubmit}>
          <div className="field">
            <label htmlFor="bucvica">Вставить буквицу</label>
            <div className="insert-text-row">
              <input
                id="bucvica"
                name="bucvica"
                className="form-control"
                ref={(el) => { this.bucvicaInput = el }}
                onKeyDown={this.onBucvicaKeyDown}
              />
              <button
                type="button"
                className="btn btn-primary insert-text-btn"
                onClick={this.insertBucvica}
              >
                Вставить
              </button>
            </div>
          </div>
        </form>
        <form onSubmit={this.preventSubmit}>
          <div className="field">
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
        <button
          type="button"
          className="btn btn-secondary insert-text-new-para"
          onClick={this.newParagraph}
        >
          Новый абзац
        </button>
        <div className="toggleShowPagination custom-control custom-checkbox">
          <input
            type="checkbox"
            defaultChecked
            className="custom-control-input"
            id="showPagination"
            onChange={this.toggleShowPagination}
          />
          <label
            className="custom-control-label"
            htmlFor="showPagination"
          >
            Отображать номера страниц
          </label>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  compositions: state.compositions,
  currentParagraphNum: state.paper.currentParagraphNum,
  currentPageNum: state.paper.currentPageNum,
  syllables: state.paper.syllables,
})
const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    changeParagraph,
    addSyllable,
    toggleShowPagination,
  },
  dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(InsertText)

InsertText.propTypes = {
  actions: PropTypes.object,
  currentParagraphNum: PropTypes.number,
  currentPageNum: PropTypes.number,
  syllables: PropTypes.array,
}
