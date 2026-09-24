import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { SMUFL } from '../../utils/musicMap'
import '../MusicStaff/style.css' // Bravura Text @font-face

/**
 * Continuous staff + treble clef for each visual row in a paragraph.
 * Clef uses Bravura (same as notes); positions have no CSS transforms
 * so html2canvas PDF export stays aligned.
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

    const paragraphRect = paragraph.getBoundingClientRect()
    const staffs = paragraph.querySelectorAll('.musicStaff')
    const tops = []

    staffs.forEach((staff) => {
      const top = staff.getBoundingClientRect().top - paragraphRect.top + paragraph.scrollTop
      const last = tops[tops.length - 1]
      if (last === undefined || top > last + 8) {
        tops.push(top)
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
}

export default ParagraphClefs
