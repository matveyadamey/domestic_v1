import React, { Component } from 'react'
import PropTypes from 'react-proptypes'
import { connect } from 'react-redux'

import { Symbol } from '../../containers'
import './style.css'

class CurrentSymbols extends Component { //eslint-disable-line
  render() {
    const { currentSymbols } = this.props
    return (
      <div className="currentSymbols text-left">
        <h4>Подходящие знамена</h4>
        { currentSymbols.length === 0 ?
          <p>Подходящих знамен нет</p>
          : <div className="currentSymbolsArea">{ currentSymbols.map((symbol, index) => (
            <Symbol
              key={index}
              value={symbol.value}
              name={symbol.name}
              pitch={symbol.pitch}
              opts={symbol.opts}
              notes={symbol.notes}
            />
          )) }</div>}
      </div>
    )
  }
}

const mapStateToProps = state => ({
  currentSymbols: state.symbols.currentSymbols,
})

export default connect(mapStateToProps)(CurrentSymbols)

CurrentSymbols.propTypes = {
  currentSymbols: PropTypes.array,
}
