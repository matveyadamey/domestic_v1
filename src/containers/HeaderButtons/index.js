import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap'
import { setSyllables, toggleShowDvoeznamennik } from '../../actions'
import { Help } from './../index'
import PaperStyle from '../../components/PaperStyle'
import { exportPagesToPdf } from '../../utils/exportPdf'
import { prepareLoadedSyllables } from '../../utils/paginateOverflow'
import { saveWithDialog } from '../../utils/saveFile'
import logo from '../../res/kruk.svg'
import './style.css'

const EMPTY_DOCUMENT = [[[]]]

class HeaderButtons extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showModalHelp: false,
      showSettings: false,
      showMenu: false,
      exportingPdf: false,
      showNewDocumentModal: false,
      savingBeforeNew: false,
    }
  }

  componentDidMount() {
    window.addEventListener('keydown', this.handleGlobalKeyDown)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleGlobalKeyDown)
  }

  handleGlobalKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
      e.preventDefault()
      e.stopPropagation()
      this.exportPdf()
    }
    if (e.key === 'Escape') {
      if (this.state.showSettings) {
        this.closeSettings()
        return
      }
      if (this.state.showMenu) {
        this.closeMenu()
      }
    }
  }

  handleFile = (e) => {
    const file = e.target.files[0]
    if (file) {
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = evt => resolve(evt.target.result)
        reader.readAsText(file)
        reader.onerror = reject
      })
        .then(this.processFileContent)
        .catch(err => console.log(err))
      this.closeMenu()
    }
    e.target.value = ''
  }

  processFileContent = (data) => {
    const { actions } = this.props
    try {
      const parsed = JSON.parse(data)
      const syllablesData = parsed.syllables || parsed
      if (Array.isArray(syllablesData)) {
        // One page + drop duplicate kruk glyphs (e.g. «-»/«го» both Подчашие)
        actions.setSyllables(prepareLoadedSyllables(syllablesData))
      } else {
        console.error('Loaded data is not an array:', parsed)
      }
    } catch (err) {
      console.error('Failed to parse JSON:', err)
    }
  }

  downloadFile = () => {
    this.closeMenu()
    this.saveCurrentDocument().catch((err) => {
      console.error(err)
      window.alert(err.message || 'Не удалось сохранить файл')
    })
  }

  saveCurrentDocument = () => {
    const { paper } = this.props
    const dataToDownload = JSON.stringify({ syllables: paper.syllables }, null, 2)
    return saveWithDialog({
      defaultName: 'domestikos.json',
      data: dataToDownload,
      mimeType: 'application/json;charset=utf-8',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
  }

  openNewDocumentModal = () => {
    this.closeMenu()
    this.setState({ showNewDocumentModal: true })
  }

  closeNewDocumentModal = () => {
    if (this.state.savingBeforeNew) return
    this.setState({ showNewDocumentModal: false })
  }

  createEmptyDocument = () => {
    const { actions } = this.props
    actions.setSyllables(EMPTY_DOCUMENT)
    this.setState({ showNewDocumentModal: false, savingBeforeNew: false })
  }

  saveAndCreateNewDocument = () => {
    if (this.state.savingBeforeNew) return
    this.setState({ savingBeforeNew: true })
    this.saveCurrentDocument()
      .then((saved) => {
        if (saved) {
          this.createEmptyDocument()
        } else {
          this.setState({ savingBeforeNew: false })
        }
      })
      .catch((err) => {
        console.error(err)
        window.alert(err.message || 'Не удалось сохранить файл')
        this.setState({ savingBeforeNew: false })
      })
  }

  discardAndCreateNewDocument = () => {
    if (this.state.savingBeforeNew) return
    this.createEmptyDocument()
  }

  exportPdf = () => {
    if (this.state.exportingPdf) return
    this.closeMenu()
    this.setState({ exportingPdf: true })
    exportPagesToPdf('domestikos.pdf')
      .catch((err) => {
        console.error(err)
        window.alert(err.message || 'Не удалось экспортировать PDF')
      })
      .then(() => {
        this.setState({ exportingPdf: false })
      })
  }

  toggleModalHelp = () => {
    this.closeMenu()
    this.setState(state => ({
      showModalHelp: !state.showModalHelp,
    }))
  }

  toggleMenu = () => {
    this.setState(state => ({
      showMenu: !state.showMenu,
      showSettings: false,
    }))
  }

  closeMenu = () => {
    this.setState({ showMenu: false })
  }

  scrollPaperThroughBackdrop = (e) => {
    const paper = document.querySelector('.Paper > .paperArea')
    if (!paper) return
    paper.scrollTop += e.deltaY
  }

  toggleSettings = () => {
    this.setState(state => ({
      showSettings: !state.showSettings,
      showMenu: false,
    }))
  }

  closeSettings = () => {
    this.setState({ showSettings: false })
  }

  render() {
    const {
      showSettings,
      showMenu,
      exportingPdf,
      showNewDocumentModal,
      savingBeforeNew,
    } = this.state
    const { showDvoeznamennik, actions } = this.props
    return (
      <React.Fragment>
        <Help toggle={this.toggleModalHelp} showModalHelp={this.state.showModalHelp} />
        <Modal isOpen={showNewDocumentModal} toggle={this.closeNewDocumentModal}>
          <ModalHeader toggle={this.closeNewDocumentModal}>Новый документ</ModalHeader>
          <ModalBody>
            <p>Сохранить текущий документ перед созданием нового?</p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onClick={this.saveAndCreateNewDocument}
              disabled={savingBeforeNew}
            >
              {savingBeforeNew ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button
              color="warning"
              onClick={this.discardAndCreateNewDocument}
              disabled={savingBeforeNew}
            >
              Не сохранять
            </Button>
            <Button
              color="secondary"
              onClick={this.closeNewDocumentModal}
              disabled={savingBeforeNew}
            >
              Отмена
            </Button>
          </ModalFooter>
        </Modal>

        <div className="app-menu">
          <div className="app-menu-chrome">
            <button
              type="button"
              className={`app-menu-toggle${showMenu ? ' is-open' : ''}`}
              onClick={this.toggleMenu}
              aria-label="Меню"
              aria-expanded={showMenu}
            >
              <span className="app-menu-toggle-bar" />
              <span className="app-menu-toggle-bar" />
              <span className="app-menu-toggle-bar" />
            </button>
            <div className="app-menu-brand" title="Δομέστικος">
              <img className="app-menu-logo" alt="Δομέστικος" src={logo} />
              <span className="app-menu-title">Δομέστικος</span>
            </div>
          </div>

          {showMenu ? (
            <div
              className="app-menu-backdrop"
              onClick={this.closeMenu}
              onWheel={this.scrollPaperThroughBackdrop}
            />
          ) : null}

          <div className={`app-menu-panel${showMenu ? '' : ' is-hidden'}`}>
            <div id="hidden-export-container" style={{ display: 'none' }} />

            <button
              type="button"
              className="btn btn-light app-menu-item button-new-document"
              onClick={this.openNewDocumentModal}
            >
              Новый документ
            </button>

            <div className="file btn-light btn app-menu-item">
              Загрузить из файла
              <input className="input-upload" type="file" name="myfile" onChange={this.handleFile} />
            </div>

            <button
              type="button"
              className="btn btn-light app-menu-item button-download"
              onClick={this.downloadFile}
            >
              Экспорт в файл
            </button>

            <button
              type="button"
              className="btn btn-light app-menu-item button-pdf"
              onClick={this.exportPdf}
              disabled={exportingPdf}
              title="Ctrl+R"
            >
              {exportingPdf ? 'PDF…' : 'Экспорт в PDF'}
            </button>

            <div className="header-dvoeznamennik custom-control custom-checkbox app-menu-item">
              <input
                type="checkbox"
                className="custom-control-input"
                id="showDvoeznamennik"
                checked={!!showDvoeznamennik}
                onChange={() => actions.toggleShowDvoeznamennik()}
              />
              <label className="custom-control-label" htmlFor="showDvoeznamennik">
                Двоезнаменник
              </label>
            </div>

            <button
              type="button"
              className="btn btn-primary app-menu-item button-help"
              onClick={this.toggleModalHelp}
            >
              Помощь
            </button>
          </div>
        </div>

        <div className="app-settings">
          <button
            type="button"
            className={`app-settings-toggle${showSettings ? ' is-open' : ''}`}
            onClick={this.toggleSettings}
            aria-label="Настройки"
            aria-expanded={showSettings}
            title="Настройки"
          >
            <span className="app-settings-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="9" cy="7" r="2.2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="2.2" fill="currentColor" stroke="none" />
                <circle cx="11" cy="17" r="2.2" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </button>

          {showSettings ? (
            <div
              className="app-settings-backdrop"
              onClick={this.closeSettings}
              onWheel={this.scrollPaperThroughBackdrop}
            />
          ) : null}

          <div className={`app-settings-panel${showSettings ? '' : ' is-hidden'}`}>
            <PaperStyle />
          </div>
        </div>
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  paper: state.paper,
  showDvoeznamennik: state.paper.showDvoeznamennik,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ setSyllables, toggleShowDvoeznamennik }, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(HeaderButtons)

HeaderButtons.propTypes = {
  paper: PropTypes.object,
  actions: PropTypes.object,
  showDvoeznamennik: PropTypes.bool,
}
