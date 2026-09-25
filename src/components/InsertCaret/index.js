import React from 'react'
import PropTypes from 'prop-types'
import './style.css'

/** Visual insert point between syllables (not clickable — set via underlay/syllable). */
const InsertCaret = ({ active }) => (
  <div
    className={`insert-caret${active ? ' is-active' : ''}`}
    aria-hidden="true"
  />
)

InsertCaret.propTypes = {
  active: PropTypes.bool,
}

InsertCaret.defaultProps = {
  active: false,
}

export default InsertCaret
