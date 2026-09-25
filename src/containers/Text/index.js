import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'
import ButtonRemove from '../../components/ButtonRemove'
import InsertCaret from '../../components/InsertCaret'

import './style.css'

class Text extends PureComponent {
  placeCaret = (e) => {
    if (e.target.closest && e.target.closest('.text-remove-button')) return
    e.stopPropagation()
    const { setInsertCaret, pageIndex, paragraphIndex, index } = this.props
    if (setInsertCaret) {
      setInsertCaret(pageIndex, paragraphIndex, index + 1)
    }
  }

  render() {
    const { text, index, pageIndex, paragraphIndex, lineTextSize, showCaretBefore } = this.props
    const size = Number(lineTextSize) || 24
    return (
      <React.Fragment>
        <div
          className="text-line"
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

const mapStateToProps = state => ({
  lineTextSize: state.form
    && state.form.paperStyle
    && state.form.paperStyle.values
    && state.form.paperStyle.values.lineTextSize,
})

export default connect(mapStateToProps)(Text)

Text.propTypes = {
  text: PropTypes.string,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  index: PropTypes.number,
  setInsertCaret: PropTypes.func,
  lineTextSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  showCaretBefore: PropTypes.bool,
}

Text.defaultProps = {
  showCaretBefore: false,
}
