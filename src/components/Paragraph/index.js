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
    const { className, onClick, children } = this.props
    return (
      <div
        className={className}
        onClick={onClick}
        ref={this.paragraphRef}
      >
        <ParagraphClefs paragraphRef={this.state.node} />
        {children}
      </div>
    )
  }
}

Paragraph.propTypes = {
  className: PropTypes.string,
  onClick: PropTypes.func,
  children: PropTypes.node,
}

export default Paragraph
