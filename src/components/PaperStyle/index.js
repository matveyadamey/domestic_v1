import React from 'react'
import PropTypes from 'prop-types'
import { Field, reduxForm } from 'redux-form'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { RangeInput } from '../../utils'
import { toggleShowPagination } from '../../actions'
import './style.css'

const PaperStyle = ({ showPagination, actions }) => (
  <div className="paperStyle text-left">
    <h4>Настройки</h4>
    <label htmlFor="fontRange">Размер знамен</label>
    <Field
      name="fontSize"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="fontRange"
      min="30"
      max="80"
      step="10"
    />
    <label htmlFor="textSize">Размер текста под крюками</label>
    <Field
      name="textSize"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="textSize"
      min="12"
      max="40"
      step="4"
    />
    <label htmlFor="lineTextSize">Размер текстовых строк</label>
    <Field
      name="lineTextSize"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="lineTextSize"
      min="12"
      max="40"
      step="4"
    />
    <label htmlFor="notesSize">Размер нот и нотного стана</label>
    <Field
      name="notesSize"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="notesSize"
      min="50"
      max="150"
      step="10"
    />
    <label htmlFor="staffTextGap">Расстояние между станом и текстом</label>
    <Field
      name="staffTextGap"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="staffTextGap"
      min="0"
      max="25"
      step="1"
    />
    <label htmlFor="sizeOfBucvica">Размер буквицы</label>
    <Field
      name="sizeOfBucvica"
      type="range"
      className="custom-range"
      component={RangeInput}
      id="sizeOfBucvica"
      min="20"
      max="180"
    />
    <div className="toggleShowPagination custom-control custom-checkbox">
      <input
        type="checkbox"
        className="custom-control-input"
        id="showPagination"
        checked={!!showPagination}
        onChange={() => actions.toggleShowPagination()}
      />
      <label
        className="custom-control-label"
        htmlFor="showPagination"
      >
        Отображать номера страниц
      </label>
    </div>
  </div>
)

PaperStyle.propTypes = {
  showPagination: PropTypes.bool,
  actions: PropTypes.object,
}

const PaperStyleWithForm = reduxForm({
  form: 'paperStyle',
  destroyOnUnmount: false,
})(PaperStyle)

const mapStateToProps = state => ({
  initialValues: {
    fontSize: 40,
    textSize: 16,
    lineTextSize: 24,
    notesSize: 100,
    staffTextGap: 16,
    sizeOfBucvica: 20,
    sizeOfPage: 900,
  },
  showPagination: state.paper.showPagination,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ toggleShowPagination }, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(PaperStyleWithForm)
