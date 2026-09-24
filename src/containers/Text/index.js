
import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import ButtonRemove from '../../components/ButtonRemove'

import './style.css'

class Text extends PureComponent {
  render() {
    const { text, index, pageIndex, paragraphIndex } = this.props
    return (
      <React.Fragment>
        <div
          className="text-line"
          data-paginate-item="1"
          data-page={pageIndex}
          data-paragraph={paragraphIndex}
          data-index={index}
        >
          {text}
          <ButtonRemove index={index} pageIndex={pageIndex} className="text-remove-button" />
        </div>
      </React.Fragment>

    )
  }
}

export default Text

Text.propTypes = {
  text: PropTypes.string,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  index: PropTypes.number,
}
