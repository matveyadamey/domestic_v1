import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import {
  removeSyllablebyIndex,
  checkParagraphIsEmpty,
  setInsertCaret,
} from '../../actions'

import InsertCaret from '../../components/InsertCaret'

import './style.css'

/**
 * Drop capital aligned with underlay text of neighboring kruki.
 * Hidden symbol (+ staff spacer) match a kruk column so pagination stays even.
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
    if (e.target.closest && e.target.closest('.bucvica-button')) return
    e.stopPropagation()
    const { actions, pageIndex, paragraphIndex, index } = this.props
    if (actions.setInsertCaret) {
      actions.setInsertCaret(pageIndex, paragraphIndex, index + 1)
    }
  }

  render() {
    const { form, text, index, showDvoeznamennik, showCaretBefore } = this.props
    const values = form && form.paperStyle && form.paperStyle.values
    const fontSize = (values && values.fontSize) || 40
    const bucSize = (values && values.sizeOfBucvica) || 20
    // Underlay text band height — bucvica sits on the same baseline, grows up
    const textSize = (values && values.textSize) || 16

    return (
      <div
        className={`syllable bucvica size${fontSize}`}
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

const mapStateToProps = state => ({
  form: state.form,
  showDvoeznamennik: state.paper.showDvoeznamennik,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    removeSyllablebyIndex,
    checkParagraphIsEmpty,
    setInsertCaret,
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
}

Bucvica.defaultProps = {
  showDvoeznamennik: true,
  showCaretBefore: false,
}
