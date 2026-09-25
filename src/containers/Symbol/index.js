import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { isNil } from 'lodash'
import {
  addSyllable,
  changeSyllable,
  insertSyllable,
  hideModal,
} from '../../actions'
import { enrichSyllableWithNotes, getLastKrukFromPaper } from '../../utils/resolveNotes'
import './style.css'

class Symbol extends Component { // eslint-disable-line

  addSyllable = () => {
    const {
      actions, value, name, pitch, opts, notes, paper,
      editableSyllable, indexToInsert,
    } = this.props
    const prev = getLastKrukFromPaper(paper)
    let text = '-'
    if (!isNil(editableSyllable)) {
      const para = paper.syllables[paper.currentPageNum]
        && paper.syllables[paper.currentPageNum][paper.currentParagraphNum]
      const existing = para && para[editableSyllable]
      if (existing && existing.text != null) text = existing.text
    }

    const syllableForInsert = enrichSyllableWithNotes({
      value,
      name,
      pitch,
      opts,
      notes,
      text,
      type: 'KRUK',
    }, prev)

    if (!isNil(editableSyllable)) {
      actions.changeSyllable(editableSyllable, syllableForInsert)
      actions.hideModal()
      return
    }
    if (!isNil(indexToInsert)) {
      actions.insertSyllable(indexToInsert, syllableForInsert)
      actions.hideModal()
      return
    }
    actions.addSyllable(syllableForInsert)
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
      </div>
    )
  }
}

const mapStateToProps = state => ({
  paper: state.paper,
  editableSyllable: state.paper.editableSyllable,
  indexToInsert: state.paper.indexToInsert,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    addSyllable,
    changeSyllable,
    insertSyllable,
    hideModal,
  }, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(Symbol)

Symbol.propTypes = {
  value: PropTypes.string,
  pitch: PropTypes.string,
  name: PropTypes.string,
  opts: PropTypes.array,
  notes: PropTypes.string,
  paper: PropTypes.object,
  actions: PropTypes.object,
  editableSyllable: PropTypes.number,
  indexToInsert: PropTypes.number,
}
