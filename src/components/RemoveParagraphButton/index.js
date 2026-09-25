import React, { PureComponent } from 'react'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { showModalDeleteParagraph, changePage } from '../../actions'

class RemoveParagraphButton extends PureComponent {
  removeParagraph = (e, paragraphIndex) => {
    e.preventDefault()
    e.stopPropagation()
    const { actions, pageIndex } = this.props
    actions.changePage(pageIndex)
    actions.showModalDeleteParagraph(paragraphIndex)
  }

  render() {
    const { paragraphIndex } = this.props
    return (
      <button
        type="button"
        name={paragraphIndex}
        onClick={e => this.removeParagraph(e, paragraphIndex)}
        className="paragraph-remove-button"
      >
        <i className="icon-bin" />
      </button>
    )
  }
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ showModalDeleteParagraph, changePage }, dispatch),
})

export default connect(() => ({}), mapDispatchToProps)(RemoveParagraphButton)

RemoveParagraphButton.propTypes = {
  paragraphIndex: PropTypes.number,
  pageIndex: PropTypes.number,
  actions: PropTypes.object,
}
