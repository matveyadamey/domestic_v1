import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { setSyllables } from '../../actions'
import { Help } from './../index'
import PaperStyle from '../../components/PaperStyle'
import { exportPagesToPdf } from '../../utils/exportPdf'
import { prepareLoadedSyllables } from '../../utils/paginateOverflow'
import { saveWithDialog } from '../../utils/saveFile'
import './style.css'

class HeaderButtons extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showModalHelp: false,
      showSettings: false,
      exportingPdf: false,
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
    }
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
    const { paper } = this.props
    const dataToDownload = JSON.stringify({ syllables: paper.syllables }, null, 2)
    saveWithDialog({
      defaultName: 'domestikos.json',
      data: dataToDownload,
      mimeType: 'application/json;charset=utf-8',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    }).catch((err) => {
      console.error(err)
      window.alert(err.message || 'Не удалось сохранить файл')
    })
  }

  exportPdf = () => {
    if (this.state.exportingPdf) return
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
    this.setState({
      showModalHelp: !this.state.showModalHelp,
    })
  }

  toggleSettings = () => {
    this.setState(state => ({
      showSettings: !state.showSettings,
    }))
  }

  closeSettings = () => {
    this.setState({ showSettings: false })
  }

  render() {
    const { showSettings, exportingPdf } = this.state
    return (
      <React.Fragment>
        <Help toggle={this.toggleModalHelp} showModalHelp={this.state.showModalHelp} />
        <div className="import-export">
          <div id="hidden-export-container" style={{ display: 'none' }} />
          <div className="file btn-light btn">
            Загрузить из файла
            <input className="input-upload" type="file" name="myfile" onChange={this.handleFile} />
          </div>
          <button className="btn btn-light button-download" onClick={this.downloadFile}>Экспорт в файл</button>
          <button
            type="button"
            className="btn btn-light button-pdf"
            onClick={this.exportPdf}
            disabled={exportingPdf}
            title="Ctrl+R"
          >
            {exportingPdf ? 'PDF…' : 'Экспорт в PDF'}
          </button>
          <div className="header-settings">
            <button
              type="button"
              className={`btn btn-light button-settings${showSettings ? ' active' : ''}`}
              onClick={this.toggleSettings}
            >
              Настройки
            </button>
            {showSettings ? (
              <div className="header-settings-backdrop" onClick={this.closeSettings} />
            ) : null}
            <div className={`header-settings-panel${showSettings ? '' : ' is-hidden'}`}>
              <PaperStyle />
            </div>
          </div>
          <button className="btn button-help btn-primary" onClick={this.toggleModalHelp}>Помощь</button>
        </div>
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  paper: state.paper,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ setSyllables }, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(HeaderButtons)

HeaderButtons.propTypes = {
  paper: PropTypes.object,
  actions: PropTypes.object,
}
