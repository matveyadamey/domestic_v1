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
import { syllableSizeStyle } from '../../utils/syllableSize'
import { legacyGlyphFor } from '../../utils/bucvicaLetters'

import './style.css'

/** NewDamaskin: empty space below ink inside the em-box (fontDescent / em). */
const FONT_DESC_RATIO = 0.2
/** Extra drop so the foot sits a bit below the underlay midline. */
const BASELINE_NUDGE_PT = 3

/**
 * Drop capital in the left gutter (absolute). Spacers match the first kruk
 * row; `topOffset` shifts the column below any leading TEXT (title).
 *
 * Glyph is bottom-pinned to the underlay band. Plain bottom:0 leaves a
 * gap of ~0.2×bucSize under the ink (font metrics) so large sizes look
 * like they crawl up. Shift by 0.2×(bucSize−textSize) keeps the ink on
 * the same level as the underlay text at every size; growth goes up only.
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
      form, text, index, showDvoeznamennik, showCaretBefore, selected, topOffset,
    } = this.props
    const values = form && form.paperStyle && form.paperStyle.values
    const fontSize = (values && values.fontSize) || 40
    const bucSizeRaw = Number((values && values.sizeOfBucvica) || 20)
    const bucSize = Math.min(80, Math.max(20, bucSizeRaw))
    const textSize = Number((values && values.textSize) || 16)
    // Keep ink on underlay level: cancel extra gap when bucSize ≠ textSize
    const baselineShiftPt = FONT_DESC_RATIO * (bucSize - textSize) + BASELINE_NUDGE_PT
    // Old Slavonic letters live in NewDamaskin's Russian slots (Ї → «И»)
    const legacyGlyph = legacyGlyphFor(text)

    return (
      <div
        className={`syllable bucvica${selected ? ' syllable--selected' : ''}`}
        data-paginate-item="1"
        data-page={this.props.pageIndex}
        data-paragraph={this.props.paragraphIndex}
        data-index={index}
        onClick={this.placeCaret}
        style={{
          ...syllableSizeStyle(fontSize),
          ...(topOffset ? { top: topOffset } : null),
        }}
      >
        {showCaretBefore ? <InsertCaret active /> : null}
        <div className="symbol bucvica-symbol" aria-hidden="true" />
        {showDvoeznamennik ? (
          <div className="musicStaff bucvica-staff-spacer" aria-hidden="true" />
        ) : null}
        <div
          className="text bucvica-letter"
          style={{
            height: `${textSize * 1.2}pt`,
            fontSize: `${textSize}pt`,
          }}
        >
          <span
            className={`bucvica-letter-glyph${legacyGlyph ? ' bucvica-letter-glyph--old' : ''}`}
            style={{
              fontSize: `${bucSize}pt`,
              transform: `translateY(${baselineShiftPt}pt)`,
            }}
          >
            {legacyGlyph || text}
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
  topOffset: PropTypes.string,
}

Bucvica.defaultProps = {
  showDvoeznamennik: true,
  showCaretBefore: false,
  selected: false,
  topOffset: '',
}
