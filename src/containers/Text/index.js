import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'
import ButtonRemove from '../../components/ButtonRemove'
import InsertCaret from '../../components/InsertCaret'
import { setInsertCaret, extendSelection } from '../../actions'
import { shouldSuppressItemClick } from '../../utils/paperDragSelect'

import './style.css'

class Text extends PureComponent {
  placeCaret = (e) => {
    if (shouldSuppressItemClick()) return
    if (e.target.closest && e.target.closest('.text-remove-button')) return
    e.stopPropagation()
    e.preventDefault()
    const {
      setInsertCaret: setCaret,
      extendSelection: extendSel,
      pageIndex,
      paragraphIndex,
      index,
      selection,
      caretIndex,
      currentPageNum,
      currentParagraphNum,
    } = this.props
    const nextCaret = index + 1
    if (e.shiftKey && extendSel) {
      const samePara = selection
        && selection.pageIndex === pageIndex
        && selection.paragraphIndex === paragraphIndex
      const sameCaretPara = pageIndex === currentPageNum
        && paragraphIndex === currentParagraphNum
      const anchor = (samePara && selection.anchor != null)
        ? selection.anchor
        : (sameCaretPara && caretIndex != null ? caretIndex : index)
      extendSel({
        pageIndex, paragraphIndex, caretIndex: nextCaret, anchor,
      })
      return
    }
    if (setCaret) {
      setCaret(pageIndex, paragraphIndex, nextCaret)
    }
  }

  render() {
    const {
      text, index, pageIndex, paragraphIndex, lineTextSize, showCaretBefore, selected,
    } = this.props
    const size = Number(lineTextSize) || 24
    return (
      <React.Fragment>
        <div
          className={`text-line${selected ? ' syllable--selected' : ''}`}
          style={{ fontSize: `${size}pt`, lineHeight: 1.25 }}
          data-paginate-item="1"
          data-page={pageIndex}
          data-paragraph={paragraphIndex}
          data-index={index}
          onClick={this.placeCaret}
        >
          {showCaretBefore ? <InsertCaret active /> : null}
          {text}
          <ButtonRemove index={index} pageIndex={pageIndex} className="text-remove-button" />
        </div>
      </React.Fragment>

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
    lineTextSize: state.form
      && state.form.paperStyle
      && state.form.paperStyle.values
      && state.form.paperStyle.values.lineTextSize,
    selection: sel,
    caretIndex: state.paper.caretIndex,
    currentPageNum: state.paper.currentPageNum,
    currentParagraphNum: state.paper.currentParagraphNum,
    selected,
  }
}

const mapDispatchToProps = {
  setInsertCaret,
  extendSelection,
}

export default connect(mapStateToProps, mapDispatchToProps)(Text)

Text.propTypes = {
  text: PropTypes.string,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  index: PropTypes.number,
  setInsertCaret: PropTypes.func,
  extendSelection: PropTypes.func,
  lineTextSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  showCaretBefore: PropTypes.bool,
  selected: PropTypes.bool,
  selection: PropTypes.object,
  caretIndex: PropTypes.number,
  currentPageNum: PropTypes.number,
  currentParagraphNum: PropTypes.number,
}

Text.defaultProps = {
  showCaretBefore: false,
  selected: false,
}
