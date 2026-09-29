import { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import {
  undo,
  copySelection,
  cutSelection,
  pasteClipboard,
  clearSelection,
  checkParagraphIsEmpty,
} from '../../actions'

/**
 * Global paper shortcuts — mounted from Paper so they work even while
 * AreaOfSymbols is still loading paperStyle.
 */
class PaperKeyboard extends Component {
  componentDidMount() {
    window.addEventListener('keydown', this.onKeyDown, true)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown, true)
  }

  shouldIgnore = (el) => {
    if (!el || !el.closest) return false
    if (el.closest('.syllable-text-edit')) return true
    if (el.closest('.modal')) return true
    if (el.closest('.app-menu-panel')) return true
    if (el.closest('.app-settings-panel')) return true
    return false
  }

  isModKey = (e, code, letterFallback) => {
    if (!e.ctrlKey && !e.metaKey) return false
    if (e.code === code) return true
    if (!e.code && letterFallback && (e.key === letterFallback || e.key === letterFallback.toUpperCase())) {
      return true
    }
    return false
  }

  onKeyDown = (e) => {
    if (this.shouldIgnore(e.target)) return

    const { selection, actions } = this.props

    if (this.isModKey(e, 'KeyZ', 'z') && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      actions.undo()
      return
    }

    if (this.isModKey(e, 'KeyC', 'c')) {
      if (!selection) return
      e.preventDefault()
      e.stopPropagation()
      actions.copySelection()
      return
    }

    if (this.isModKey(e, 'KeyX', 'x')) {
      if (!selection) return
      e.preventDefault()
      e.stopPropagation()
      actions.cutSelection()
      actions.checkParagraphIsEmpty()
      return
    }

    if (this.isModKey(e, 'KeyV', 'v')) {
      e.preventDefault()
      e.stopPropagation()
      actions.pasteClipboard()
      return
    }

    if (e.key === 'Escape' && selection) {
      e.preventDefault()
      actions.clearSelection()
    }
  }

  render() {
    return null
  }
}

PaperKeyboard.propTypes = {
  selection: PropTypes.object,
  actions: PropTypes.object.isRequired,
}

const mapStateToProps = state => ({
  selection: state.paper.selection,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    undo,
    copySelection,
    cutSelection,
    pasteClipboard,
    clearSelection,
    checkParagraphIsEmpty,
  }, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(PaperKeyboard)
