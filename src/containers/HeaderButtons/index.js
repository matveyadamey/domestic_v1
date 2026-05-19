import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { saveAs } from 'file-saver'
import { setSyllables } from '../../actions'
import { Help } from './../index'
import './style.css'

class HeaderButtons extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showModalHelp: false,
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
        actions.setSyllables(syllablesData)
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
    const blob = new Blob([dataToDownload], { type: 'application/json; charset=utf-8' })
    saveAs(blob, 'domestikos.json')
  }

  toggleModalHelp = () => {
    this.setState({
      showModalHelp: !this.state.showModalHelp,
    })
  }

  render() {
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