import React from 'react'
import PropTypes from 'prop-types'
import { SMUFL } from '../../utils/musicMap'
import './style.css'

/** Staff line step in px — half of 11px line spacing on the continuous staff. */
const STEP_HEIGHT = 5.5
/** Distance from spacer bottom to bottom staff line (tuned so line bisects notehead). */
const BASE_BOTTOM = 5
/** Horizontal slot per note when packing 3+ notes (avoids overlap). */
const WIDE_NOTE_SLOT = 26

/**
 * Empty spacer + optional Bravura notes aligned to the paragraph staff.
 */
const MusicStaff = ({ notesData }) => {
  const count = notesData && notesData.length ? notesData.length : 0
  const wide = count >= 3
  const style = wide ? { minWidth: count * WIDE_NOTE_SLOT } : undefined

  return (
    <div
      className={`musicStaff${wide ? ' musicStaff--wide' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {count > 0 ? (
        <div className="musicStaff-notes">
          {notesData.map((note, nIdx) => {
            const verticalPos = `${BASE_BOTTOM + (note.offset * STEP_HEIGHT)}px`
            return (
              <div key={nIdx} className="bravura-note-item">
                {note.ledgers && note.ledgers.map((lPos, lIdx) => (
                  <span
                    key={lIdx}
                    className="b-ledger"
                    style={{ bottom: `${BASE_BOTTOM + (lPos * STEP_HEIGHT)}px` }}
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
}

MusicStaff.defaultProps = {
  notesData: null,
}

export default MusicStaff
