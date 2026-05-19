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
} from '../../actions'

import {
  Bucvica,
  Text,
  Syllable,
} from '../../containers'

import { Loading, getPageNum } from '../../utils'

import {
  RemovePageButton,
  RemoveParagraphButton,
} from '../'

import './style.css'

class AreaOfSymbols extends Component {

  renderPages = () => {
    const { syllables, actions, showPagination, currentPageNum } = this.props
    let pageTemplate = null

    if (Array.isArray(syllables)) {
      pageTemplate = syllables.map((item, pageIndex) => (
        <React.Fragment>
          <div className={ pageIndex === currentPageNum ? "a4 activePage" : "a4" } key={pageIndex} onClick={() => actions.changePage(pageIndex)}>
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
      <div className="paragraphWrapper">
        <RemoveParagraphButton paragraphIndex={paragraphIndex} pageIndex={pageIndex} />
        <div className={ pageIndex + '' + paragraphIndex === currentPageNum + '' + currentParagraphNum ? "paragraph activeParagraph" : "paragraph" } key={paragraphIndex + '' + pageIndex} onClick={(e) => this.changeParagraph(e, paragraphIndex)} >
          {this.renderOneParagraph(paragraph, paragraphIndex, pageIndex)}
        </div>
      </div>
    ))
    return syllablesTemplate
  }

  renderOneParagraph = (paragraph, paragraphIndex, pageIndex) => {
    const { form, actions } = this.props
    if (!Array.isArray(paragraph)) return null
    const syllablesTemplate = paragraph.map(({ value, text, type }, index) => (
      type === 'KRUK' ? <Syllable value={value} text={text} key={parseInt(index,10)} paragraphIndex={paragraphIndex} pageIndex={pageIndex} index={parseInt(index,10)} /> : 
      type === 'BUCVICA' ? <Bucvica form={form} removeSyllablebyIndex={actions.removeSyllablebyIndex} changePage={actions.changePage} text={text} index={parseInt(index,10)} paragraphIndex={paragraphIndex} pageIndex={pageIndex}/> : 
      type === 'TEXT' ? <Text text={text} pageIndex={pageIndex} index={parseInt(index,10)} key={parseInt(`${pageIndex}${paragraphIndex}${index}`, 10)} /> : 
      type === 'BREAK' ? <hr className="break" /> : null
    ))
    return syllablesTemplate
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