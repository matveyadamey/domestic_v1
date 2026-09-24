import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'

import './style.css'

/** Fallback when a bucvica is not followed by a kruk (no staff — staff comes with kruki). */
class Bucvica extends PureComponent {
  removeLastSyllable() {
    const { removeSyllablebyIndex, changePage, index, pageIndex } = this.props
    changePage(pageIndex)
    removeSyllablebyIndex(index)
  }

  render() {
    const { form, text, index } = this.props
    const fontSize = (form && form.paperStyle && form.paperStyle.values
      && form.paperStyle.values.fontSize) || 40

    return (
      <div
        className={`syllable bucvica size${fontSize}`}
        data-paginate-item="1"
        data-page={this.props.pageIndex}
        data-paragraph={this.props.paragraphIndex}
        data-index={index}
      >
        <div className="symbol bucvica-symbol" aria-hidden="true" />
        <div className="text bucvica-letter">{text}</div>
        <button
          type="button"
          name={index}
          onClick={e => this.removeLastSyllable(e)}
          className="bucvica-button"
        >
          <i className="icon-bin" />
        </button>
      </div>
    )
  }
}

export default Bucvica

Bucvica.propTypes = {
  form: PropTypes.object,
  text: PropTypes.string,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  index: PropTypes.number,
  removeSyllablebyIndex: PropTypes.func,
  changePage: PropTypes.func,
}
