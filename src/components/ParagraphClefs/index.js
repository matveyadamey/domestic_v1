import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { SMUFL } from '../../utils/musicMap'
import '../MusicStaff/style.css' // Bravura Text @font-face

/**
 * Continuous staff + treble clef for each visual row in a paragraph.
 * Clef uses Bravura (same as notes); positions have no CSS transforms
 * so PDF export (html-to-image) stays aligned.
 */
class ParagraphClefs extends Component {
  state = { tops: [] }

  componentDidMount() {
    this.measure()
    window.addEventListener('resize', this.measure)

    if (typeof window.ResizeObserver !== 'undefined') {
      this.ro = new window.ResizeObserver(this.measure)
      if (this.props.paragraphRef) {
        this.ro.observe(this.props.paragraphRef)
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.paragraphRef !== this.props.paragraphRef) {
      if (this.ro) {
        this.ro.disconnect()
        if (this.props.paragraphRef) {
          this.ro.observe(this.props.paragraphRef)
        }
      }
    }
    this.measure()
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.measure)
    if (this.ro) {
      this.ro.disconnect()
    }
  }

  measure = () => {
    const paragraph = this.props.paragraphRef
    if (!paragraph) return

    // Cluster by syllable column tops (flex-start aligns them). Staff tops alone
    // vary with glyph height and created extra nearly-empty staff rows.
    const scale = (Number(this.props.notesSize) || 100) / 100
    const rowGap = 40 * scale
    const paragraphRect = paragraph.getBoundingClientRect()
    const items = paragraph.querySelectorAll('[data-paginate-item="1"]')
    const tops = []
    let lastItemTop = null

    items.forEach((el) => {
      if (el.classList.contains('text-line')) return
      const staff = el.querySelector('.musicStaff')
      if (!staff || staff.classList.contains('bucvica-staff-spacer')) return

      const itemTop = el.getBoundingClientRect().top - paragraphRect.top + paragraph.scrollTop
      const staffTop = staff.getBoundingClientRect().top - paragraphRect.top + paragraph.scrollTop

      if (lastItemTop === null || itemTop > lastItemTop + rowGap) {
        tops.push(staffTop)
        lastItemTop = itemTop
      }
    })

    const same =
      tops.length === this.state.tops.length &&
      tops.every((t, i) => Math.abs(t - this.state.tops[i]) < 1)

    if (!same) {
      this.setState({ tops })
    }
  }

  render() {
    const { tops } = this.state
    return (
      <div className="paragraph-clefs" aria-hidden="true">
        {tops.map((top, i) => (
          <div
            key={`${i}-${Math.round(top)}`}
            className="paragraph-staff"
            style={{ top }}
          >
            <div className="paragraph-staff-lines">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <span className="paragraph-clef">{SMUFL.clef}</span>
          </div>
        ))}
      </div>
    )
  }
}

ParagraphClefs.propTypes = {
  paragraphRef: PropTypes.object,
  notesSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

ParagraphClefs.defaultProps = {
  notesSize: 100,
}

const mapStateToProps = state => ({
  notesSize: state.form
    && state.form.paperStyle
    && state.form.paperStyle.values
    && state.form.paperStyle.values.notesSize,
})

export default connect(mapStateToProps)(ParagraphClefs)
