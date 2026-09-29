import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import {
  removeSyllablebyIndex,
  checkParagraphIsEmpty,
  setInsertCaret,
  extendSelection,
} from '../../actions'

import InsertCaret from '../../components/InsertCaret'
import { shouldSuppressItemClick } from '../../utils/paperDragSelect'

import './style.css'

/**
 * Drop capital sits in the left gutter (absolute); kruk/text rows all
 * start at paragraph padding — Hidden symbol keeps first-row baseline.
 */
class Bucvica extends PureComponent {
  removeBucvica = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const {
      actions, index, pageIndex, paragraphIndex,
    } = this.props
    actions.removeSyllablebyIndex({
      index,
      pageIndex,
      paragraphIndex,
    })
    actions.checkParagraphIsEmpty()
  }

  placeCaret = (e) => {
    if (shouldSuppressItemClick()) return
    if (e.target.closest && e.target.closest('.bucvica-button')) return
    e.stopPropagation()
    e.preventDefault()
    const {
      actions, pageIndex, paragraphIndex, index,
      selection, caretIndex, currentPageNum, currentParagraphNum,
    } = this.props
    const nextCaret = index + 1
    if (e.shiftKey) {
      const samePara = selection
        && selection.pageIndex === pageIndex
        && selection.paragraphIndex === paragraphIndex
      const sameCaretPara = pageIndex === currentPageNum
        && paragraphIndex === currentParagraphNum
      const anchor = (samePara && selection.anchor != null)
        ? selection.anchor
        : (sameCaretPara && caretIndex != null ? caretIndex : index)
      actions.extendSelection({
        pageIndex,
        paragraphIndex,
        caretIndex: nextCaret,
        anchor,
      })
      return
    }
    if (actions.setInsertCaret) {
      actions.setInsertCaret(pageIndex, paragraphIndex, nextCaret)
    }
  }

  render() {
    const {
      form, text, index, showDvoeznamennik, showCaretBefore, selected,
    } = this.props
    const values = form && form.paperStyle && form.paperStyle.values
    const fontSize = (values && values.fontSize) || 40
    const bucSize = (values && values.sizeOfBucvica) || 20
    // Underlay text band — glyph bottom pinned here; letter grows upward only
    const textSize = (values && values.textSize) || 16

    return (
      <div
        className={`syllable bucvica size${fontSize}${selected ? ' syllable--selected' : ''}`}
        data-paginate-item="1"
        data-page={this.props.pageIndex}
        data-paragraph={this.props.paragraphIndex}
        data-index={index}
        onClick={this.placeCaret}
      >
        {showCaretBefore ? <InsertCaret active /> : null}
        <div className="symbol bucvica-symbol" aria-hidden="true" />
        {showDvoeznamennik ? (
          <div className="musicStaff bucvica-staff-spacer" aria-hidden="true" />
        ) : null}
        <div
          className="text bucvica-letter"
          style={{
            height: `${Number(textSize) * 1.2}pt`,
            fontSize: `${textSize}pt`,
          }}
        >
          <span
            className="bucvica-letter-glyph"
            style={{ fontSize: `${bucSize}pt` }}
          >
            {text}
          </span>
        </div>
        <button
          type="button"
          name={index}
          onClick={this.removeBucvica}
          className="bucvica-button"
          title="Удалить буквицу"
        >
          <i className="icon-bin" />
        </button>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const sel = state.paper.selection
  const selected = !!(
    sel
    && sel.pageIndex === ownProps.pageIndex
    && sel.paragraphIndex === ownProps.paragraphIndex
    && ownProps.index >= sel.start
    && ownProps.index < sel.end
  )
  return {
    form: state.form,
    showDvoeznamennik: state.paper.showDvoeznamennik,
    selection: sel,
    caretIndex: state.paper.caretIndex,
    currentPageNum: state.paper.currentPageNum,
    currentParagraphNum: state.paper.currentParagraphNum,
    selected,
  }
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    removeSyllablebyIndex,
    checkParagraphIsEmpty,
    setInsertCaret,
    extendSelection,
  }, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(Bucvica)

Bucvica.propTypes = {
  form: PropTypes.object,
  actions: PropTypes.object,
  text: PropTypes.string,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  index: PropTypes.number,
  showDvoeznamennik: PropTypes.bool,
  showCaretBefore: PropTypes.bool,
  selected: PropTypes.bool,
  selection: PropTypes.object,
  caretIndex: PropTypes.number,
  currentPageNum: PropTypes.number,
  currentParagraphNum: PropTypes.number,
}

Bucvica.defaultProps = {
  showDvoeznamennik: true,
  showCaretBefore: false,
  selected: false,
}
