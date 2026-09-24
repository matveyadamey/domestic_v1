import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import EditButtons from '../../components/EditButtons'
import MusicStaff from '../../components/MusicStaff'
import { resolveNotesData } from '../../utils/resolveNotes'
import {
  showModalEditText,
  changePage,
} from '../../actions'

import './style.css'

class Syllable extends Component {
  editText() {
    const { actions, index, pageIndex } = this.props
    actions.changePage(pageIndex)
    actions.showModalEditText(index)
  }

  render() {
    const {
      form, value, text, bucvica, index, pageIndex, paragraphIndex, notes, notesFixed, name, pitch, opts,
      prevNotes, prevPitch, nextNotes, nextPitch,
    } = this.props
    const notesData = resolveNotesData({
      notes, notesFixed, value, name, pitch, opts, prevNotes, prevPitch, nextNotes, nextPitch,
    })

    return (
      <div
        className={`syllable size${form.paperStyle.values.fontSize}${notesData.length >= 3 ? ' syllable--wide-notes' : ''}`}
        data-paginate-item="1"
        data-page={pageIndex}
        data-paragraph={paragraphIndex}
        data-index={index}
      >
        <div className="symbol" dangerouslySetInnerHTML={{ __html: value }} />
        <MusicStaff notesData={notesData} />
        <div id={index} className="text" onClick={e => this.editText(e)}>
          {bucvica ? <span className="bucvica-inline">{bucvica}</span> : null}
          <span dangerouslySetInnerHTML={{ __html: text }} />
        </div>
        <EditButtons index={index} pageIndex={pageIndex} paragraphIndex={paragraphIndex} />
      </div>
    )
  }
}

const mapStateToProps = state => ({ form: state.form })

const mapDispatchToProps = dispatch => (
  { actions: bindActionCreators({
    showModalEditText,
    changePage,
  }, dispatch) }
)

export default connect(mapStateToProps, mapDispatchToProps)(Syllable)

Syllable.propTypes = {
  form: PropTypes.object,
  actions: PropTypes.object,
  value: PropTypes.string,
  text: PropTypes.string,
  bucvica: PropTypes.string,
  index: PropTypes.number,
  pageIndex: PropTypes.number,
  paragraphIndex: PropTypes.number,
  notes: PropTypes.string,
  notesFixed: PropTypes.bool,
  name: PropTypes.string,
  pitch: PropTypes.string,
  opts: PropTypes.array,
  prevNotes: PropTypes.string,
  prevPitch: PropTypes.string,
  nextNotes: PropTypes.string,
  nextPitch: PropTypes.string,
}
