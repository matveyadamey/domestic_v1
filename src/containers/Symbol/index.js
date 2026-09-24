import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { enrichSyllableWithNotes, getLastKrukFromPaper } from '../../utils/resolveNotes'
import './style.css'

class Symbol extends Component { // eslint-disable-line

  addSyllable = () => {
    const {
      addSyllable, value, name, pitch, opts, notes, paper,
    } = this.props
    const prev = getLastKrukFromPaper(paper)
    const syllableForInsert = enrichSyllableWithNotes({
      value,
      name,
      pitch,
      opts,
      notes,
      text: '-',
      type: 'KRUK',
    }, prev)

    addSyllable(syllableForInsert)
  }

  render() {
    const { value, pitch, name } = this.props
    return (
      <div className="previewItem" onClick={() => this.addSyllable()}>
        <div
          className="previewKruk"
          dangerouslySetInnerHTML={{ __html: value }}
          data-toggle="tooltip"
          data-html="true"
          title={`${name}, помета: ${pitch}`}
        />
        <div className="sourceHtml">
          {value}
        </div>
      </div>
    )
  }
}

export default Symbol

Symbol.propTypes = {
  value: PropTypes.string,
  pitch: PropTypes.string,
  name: PropTypes.string,
  opts: PropTypes.array,
  notes: PropTypes.string,
  paper: PropTypes.object,
  addSyllable: PropTypes.func,
}
