import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { SMUFL } from '../../utils/musicMap'
import './style.css'

/** Base staff metrics at notesSize = 100. */
const BASE = {
  stepHeight: 5.5,
  baseBottom: 5,
  wideNoteSlot: 26,
  noteItemWidth: 34,
  wideNoteItemWidth: 26,
  noteItemOverlap: -10,
}

/** In-flow width so absolutely positioned note heads still get horizontal slots. */
function staffMinWidth(count, scale) {
  if (count < 2) return null
  if (count >= 3) return count * BASE.wideNoteSlot * scale
  // 2 notes: item widths + one negative gap between them
  return (2 * BASE.noteItemWidth + BASE.noteItemOverlap) * scale
}

/**
 * Empty spacer + optional Bravura notes aligned to the paragraph staff.
 */
const MusicStaff = ({ notesData, notesSize }) => {
  const scale = (Number(notesSize) || 100) / 100
  const step = BASE.stepHeight * scale
  const baseBottom = BASE.baseBottom * scale
  const count = notesData && notesData.length ? notesData.length : 0
  const wide = count >= 3
  const minWidth = staffMinWidth(count, scale)
  const style = minWidth != null ? { minWidth } : null

  return (
    <div
      className={`musicStaff${wide ? ' musicStaff--wide' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {count > 0 ? (
        <div className="musicStaff-notes">
          {notesData.map((note, nIdx) => {
            const verticalPos = `${baseBottom + (note.offset * step)}px`
            const itemStyle = {
              width: (wide ? BASE.wideNoteItemWidth : BASE.noteItemWidth) * scale,
              marginRight: wide ? 0 : BASE.noteItemOverlap * scale,
              flexShrink: 0,
            }
            return (
              <div key={nIdx} className="bravura-note-item" style={itemStyle}>
                {note.ledgers && note.ledgers.map((lPos, lIdx) => (
                  <span
                    key={lIdx}
                    className="b-ledger"
                    style={{ bottom: `${baseBottom + (lPos * step)}px` }}
                  >
                    {SMUFL.ledger}
                  </span>
                ))}
                {note.accidental ? (
                  <span className="b-acc" style={{ bottom: verticalPos }}>
                    {note.accidental}
                  </span>
                ) : null}
                <span
                  className={`b-head${note.isDown ? ' is-down' : ''}`}
                  style={{ bottom: verticalPos }}
                >
                  {note.char}
                </span>
                {note.dot ? (
                  <span className="b-dot" style={{ bottom: verticalPos }}>
                    {note.dot}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

MusicStaff.propTypes = {
  notesData: PropTypes.array,
  notesSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

MusicStaff.defaultProps = {
  notesData: null,
  notesSize: 100,
}

const mapStateToProps = state => ({
  notesSize: state.form
    && state.form.paperStyle
    && state.form.paperStyle.values
    && state.form.paperStyle.values.notesSize,
})

export default connect(mapStateToProps)(MusicStaff)
