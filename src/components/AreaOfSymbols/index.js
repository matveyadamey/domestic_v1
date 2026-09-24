import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Button } from 'reactstrap'
import { isNil } from 'lodash'

import {
  moveSyllable,
  hideModal,
  changePage,
  removePage,
  addPage,
  removeSyllablebyIndex,
  changeParagraph,
  setSyllables,
} from '../../actions'

import {
  Bucvica,
  Text,
  Syllable,
} from '../../containers'

import { Loading, getPageNum } from '../../utils'
import {
  resolveNotesString,
  resolveParagraphNotesMap,
  effectivePitchOf,
} from '../../utils/resolveNotes'
import { findSpillElement, spillSyllablesToNextPage } from '../../utils/paginateOverflow'

import {
  RemovePageButton,
  RemoveParagraphButton,
  Paragraph,
} from '../'

import './style.css'

class AreaOfSymbols extends Component {
  componentDidMount() {
    this.schedulePaginate()
  }

  componentDidUpdate(prevProps) {
    // Only re-paginate when page content changes — not on every form touch
    if (prevProps.syllables !== this.props.syllables) {
      this.schedulePaginate()
    }
  }

  componentWillUnmount() {
    if (this.paginateTimer) clearTimeout(this.paginateTimer)
  }

  schedulePaginate = () => {
    if (this.paginating) return
    if (this.paginateTimer) clearTimeout(this.paginateTimer)
    this.paginateTimer = setTimeout(this.runPaginate, 450)
  }

  runPaginate = () => {
    if (this.paginating) return
    const { syllables, actions } = this.props
    if (!Array.isArray(syllables) || !syllables.length) return

    const pageEls = document.querySelectorAll('.paperArea .a4')
    let next = syllables
    let changed = false

    for (let pageIndex = 0; pageIndex < pageEls.length; pageIndex += 1) {
      const spillEl = findSpillElement(pageEls[pageIndex])
      if (!spillEl) continue

      const paragraphIndex = parseInt(spillEl.getAttribute('data-paragraph'), 10)
      const itemIndex = parseInt(spillEl.getAttribute('data-index'), 10)
      if (Number.isNaN(paragraphIndex) || Number.isNaN(itemIndex)) continue

      const spilled = spillSyllablesToNextPage(next, pageIndex, paragraphIndex, itemIndex)
      if (!spilled) continue

      // No-op guard (same structure)
      if (JSON.stringify(spilled) === JSON.stringify(next)) continue

      next = spilled
      changed = true
      break
    }

    if (changed) {
      this.paginating = true
      actions.setSyllables(next)
      setTimeout(() => {
        this.paginating = false
        this.schedulePaginate()
      }, 500)
    }
  }

  renderPages = () => {
    const { syllables, actions, showPagination, currentPageNum } = this.props
    let pageTemplate = null

    if (Array.isArray(syllables)) {
      pageTemplate = syllables.map((item, pageIndex) => (
        <React.Fragment key={pageIndex}>
          <div className={ pageIndex === currentPageNum ? "a4 activePage" : "a4" } onClick={() => actions.changePage(pageIndex)}>
            <RemovePageButton pageIndex={pageIndex} />
            <div className="page">
              {this.renderOnePage(item, pageIndex)}
            </div>
            <span className="pagination" style={{ display: showPagination ? 'inline' : 'none' }} dangerouslySetInnerHTML={{ __html: getPageNum(pageIndex) }} />
          </div>
        </React.Fragment>
      ))
    }
    return pageTemplate
  }

  changeParagraph = (e, paragraphIndex) => {
    const { actions } = this.props
    actions.changeParagraph(paragraphIndex)
  }

  renderOnePage = (item, pageIndex) => {
    const { currentPageNum, currentParagraphNum } = this.props
    if (!Array.isArray(item)) return null
    const syllablesTemplate = item.map((paragraph, paragraphIndex) => (
      <div className="paragraphWrapper" key={`${pageIndex}-${paragraphIndex}`}>
        <RemoveParagraphButton paragraphIndex={paragraphIndex} pageIndex={pageIndex} />
        <Paragraph
          className={pageIndex + '' + paragraphIndex === currentPageNum + '' + currentParagraphNum ? 'paragraph activeParagraph' : 'paragraph'}
          onClick={e => this.changeParagraph(e, paragraphIndex)}
        >
          {this.renderOneParagraph(paragraph, paragraphIndex, pageIndex)}
        </Paragraph>
      </div>
    ))
    return syllablesTemplate
  }

  renderOneParagraph = (paragraph, paragraphIndex, pageIndex) => {
    const { form, actions } = this.props
    if (!Array.isArray(paragraph)) return null

    const nodes = []
    let pendingBucvica = null
    let pendingBucvicaIndex = null

    const notesMap = resolveParagraphNotesMap(paragraph)

    // Build next-kruk context (right-to-left) for Syllable live resolve
    const nextCtx = {}
    {
      let nextNotes = null
      let nextPitch = null
      for (let i = paragraph.length - 1; i >= 0; i -= 1) {
        const item = paragraph[i]
        if (!item || item.type !== 'KRUK') continue
        nextCtx[i] = { nextNotes, nextPitch }
        const notes = notesMap[i] || null
        if (notes) {
          nextNotes = notes
          nextPitch = effectivePitchOf(item, notes)
        } else if (item.pitch && item.pitch !== '-') {
          nextPitch = item.pitch
          nextNotes = null
        }
      }
    }

    let prevNotes = null
    let prevPitch = null

    paragraph.forEach((item, index) => {
      const { value, text, type } = item

      if (type === 'BUCVICA') {
        pendingBucvica = text
        pendingBucvicaIndex = index
        return
      }

      if (type === 'KRUK') {
        const resolvedNotes = notesMap[index] || item.notes
        const { nextNotes, nextPitch } = nextCtx[index] || {}
        nodes.push(
          <Syllable
            value={value}
            text={text}
            bucvica={pendingBucvica}
            notes={resolvedNotes}
            notesFixed={item.notesFixed}
            name={item.name}
            pitch={item.pitch}
            opts={item.opts}
            prevNotes={prevNotes}
            prevPitch={prevPitch}
            nextNotes={nextNotes}
            nextPitch={nextPitch}
            key={parseInt(index, 10)}
            paragraphIndex={paragraphIndex}
            pageIndex={pageIndex}
            index={parseInt(index, 10)}
          />
        )
        prevNotes = resolveNotesString({
          notes: resolvedNotes,
          notesFixed: item.notesFixed,
          value: item.value,
          name: item.name,
          pitch: item.pitch,
          opts: item.opts,
          prevNotes,
          prevPitch,
          nextNotes,
          nextPitch,
        }) || prevNotes
        prevPitch = effectivePitchOf(item, prevNotes) || prevPitch
        pendingBucvica = null
        pendingBucvicaIndex = null
        return
      }

      // Bucvica without a following kruk — keep standalone
      if (pendingBucvica != null) {
        nodes.push(
          <Bucvica
            form={form}
            removeSyllablebyIndex={actions.removeSyllablebyIndex}
            changePage={actions.changePage}
            text={pendingBucvica}
            index={parseInt(pendingBucvicaIndex, 10)}
            paragraphIndex={paragraphIndex}
            pageIndex={pageIndex}
            key={`bucvica-${pendingBucvicaIndex}`}
          />
        )
        pendingBucvica = null
        pendingBucvicaIndex = null
      }

      if (type === 'BREAK') {
        nodes.push(<hr className="break" key={`break-${index}`} />)
        return
      }

      if (type === 'TEXT') {
        nodes.push(
          <Text
            text={text}
            pageIndex={pageIndex}
            paragraphIndex={paragraphIndex}
            index={parseInt(index, 10)}
            key={parseInt(`${pageIndex}${paragraphIndex}${index}`, 10)}
          />
        )
      }
    })

    if (pendingBucvica != null) {
      nodes.push(
        <Bucvica
          form={form}
          removeSyllablebyIndex={actions.removeSyllablebyIndex}
          changePage={actions.changePage}
          text={pendingBucvica}
          index={parseInt(pendingBucvicaIndex, 10)}
          paragraphIndex={paragraphIndex}
          pageIndex={pageIndex}
          key={`bucvica-${pendingBucvicaIndex}`}
        />
      )
    }

    return nodes
  }

  render() {
    const { form, actions } = this.props

    if (isNil(form.paperStyle)) {
      return <Loading />
    }

    return (
      <div className="paperArea">
          <div className="areaOfSymbols mx-auto">
            <div className="paperMargin" >
              {this.renderPages()}
              <Button
                color="primary"
                className="add-page"
                onClick={actions.addPage}
              >
                Добавить страницу
              </Button>
            </div>
          </div>
      </div>
    )
  }
}

AreaOfSymbols.propTypes = {
  syllables: PropTypes.array,
  form: PropTypes.object,
  actions: PropTypes.object,
  showPagination: PropTypes.bool,
  currentPageNum: PropTypes.number,
}

const mapDispatchToProps = dispatch => (
  { actions: bindActionCreators({
    moveSyllable,
    hideModal,
    changePage,
    removePage,
    addPage,
    removeSyllablebyIndex,
    changeParagraph,
    setSyllables,
  }, dispatch) }
)

const mapStateToProps = state => ({
  syllables: state.paper.syllables,
  form: state.form,
  showModalEdit: state.paper.showModalEdit,
  showModalEditText: state.paper.showModalEditText,
  currentPageNum: state.paper.currentPageNum,
  currentParagraphNum: state.paper.currentParagraphNum,
  showPagination: state.paper.showPagination,
})

export default connect(mapStateToProps, mapDispatchToProps)(AreaOfSymbols)