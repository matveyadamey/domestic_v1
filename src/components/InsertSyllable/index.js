import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Field, reduxForm } from 'redux-form'
import { values, isNil } from 'lodash'

import {
  getSymbols,
  filterSymbolsByName,
  filterSymbolsByOptions,
  filterSymbolsByPitch,
  removeLastSyllable,
  createOptionsList,
  createPitchList,
} from '../../actions'

import {
  RFReactSelect,
  RFReactMultiSelect,
  Loading,
} from '../../utils'
import { KRUKI } from '../../res/'

import './style.css'

class InsertSyllable extends Component {
  constructor(props) {
    super(props)

    this.handleChangeName = this.handleChangeName.bind(this)
    this.handleChangeOptions = this.handleChangeOptions.bind(this)
    this.handleChangePitch = this.handleChangePitch.bind(this)
  }

  handleChangeName(item) {
    if (isNil(item.label)) {
      return
    }
    const { actions } = this.props
    actions.getSymbols()
    actions.filterSymbolsByName(item.label)
    actions.filterSymbolsByOptions([])
    actions.createOptionsList(item.label)
    actions.createPitchList()
  }

  handleChangeOptions(options) {
    const { actions, syllableForInsert } = this.props

    delete options.preventDefault // eslint-disable-line
    const currentOptions = values(options).map(item => item.label)
    actions.filterSymbolsByOptions(currentOptions)
    actions.createPitchList()

    if (isNil(syllableForInsert.values.pitch)) {
      return
    }

    if (syllableForInsert.values.pitch.label !== '') {
      actions.filterSymbolsByPitch(syllableForInsert.values.pitch.label)
    }
  }

  handleChangePitch(item) {
    const { actions } = this.props
    actions.filterSymbolsByPitch(item.label)
  }

  render() {
    const { symbols } = this.props
    const options = symbols.options
    const pitchs = symbols.pitchs
    if (isNil(symbols)) return <Loading />
    return (
      <div className="inputForm">
        <h4 className="text-left">Введите знамя</h4>
        <div className="field">
          <label htmlFor="Name">Крюк</label>
          <Field
            name="name"
            list="symbols"
            options={KRUKI}
            onChange={this.handleChangeName}
            component={RFReactSelect}
            className="input"
          />
        </div>
        <div className="field">
          <label htmlFor="Options">Опции</label>
          <Field
            name="options"
            list="options"
            options={options}
            onChange={this.handleChangeOptions}
            component={RFReactMultiSelect}
            className="input"
          />
        </div>
        <div className="field">
          <label htmlFor="Pitch">Помета</label>
          <Field
            name="pitch"
            list="pitchs"
            options={pitchs}
            onChange={this.handleChangePitch}
            component={RFReactSelect}
            className="input"
          />
        </div>
      </div>
    )
  }
}

const InsertSyllableWithForm = reduxForm({
  form: 'syllableForInsert',
})(InsertSyllable)

const InitializeFromStateForm = connect(
  () => ({
    initialValues: { pitch: { label: '' } },
  }),
)(InsertSyllableWithForm)

const mapStateToProps = state => ({
  symbols: state.symbols,
  syllableForInsert: state.form.syllableForInsert,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({
    getSymbols,
    filterSymbolsByName,
    filterSymbolsByOptions,
    filterSymbolsByPitch,
    removeLastSyllable,
    createOptionsList,
    createPitchList,
  }, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(InitializeFromStateForm)

InsertSyllable.propTypes = {
  symbols: PropTypes.object,
  actions: PropTypes.object,
  syllableForInsert: PropTypes.object,
}
