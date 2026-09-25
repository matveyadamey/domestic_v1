import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ParagraphClefs from '../ParagraphClefs'

class Paragraph extends Component {
  paragraphRef = React.createRef()

  state = { node: null }

  componentDidMount() {
    this.setState({ node: this.paragraphRef.current })
  }

  render() {
    const { className, onClick, children, showDvoeznamennik } = this.props
    return (
      <div
        className={className}
        onClick={onClick}
        ref={this.paragraphRef}
      >
        {showDvoeznamennik ? (
          <ParagraphClefs paragraphRef={this.state.node} />
        ) : null}
        {children}
      </div>
    )
  }
}

Paragraph.propTypes = {
  className: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node,
  showDvoeznamennik: PropTypes.bool,
}

Paragraph.defaultProps = {
  showDvoeznamennik: true,
}

export default Paragraph
