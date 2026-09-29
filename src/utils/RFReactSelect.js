import React from 'react'
import Select from 'react-select'
import PropTypes from 'react-proptypes'

const menuPortalTarget = typeof document !== 'undefined' ? document.body : null

const selectMenuProps = {
  menuPortalTarget,
  menuPosition: 'fixed',
  maxMenuHeight: 220,
  styles: {
    menuPortal: base => ({ ...base, zIndex: 10000 }),
  },
}

export class RFReactSelect extends React.Component {
  constructor(props) {
    super(props)
    this.myRef = React.createRef()
  }

  // componentDidMount() {
  //   const { name } = this.props.input
  //   if (name === 'name') {
  //     console.log("object")
  //     this.myRef.current.focus()
  //   }
  // }

  render() {
    const { input, options, className } = this.props
    const { name, value, onBlur, onChange, onFocus } = input

    return (
      <Select
        valueKey="value"
        name={name}
        value={value}
        options={options}
        onChange={onChange}
        onBlur={() => onBlur(value)}
        onFocus={onFocus}
        className={className}
        {...selectMenuProps}
        // ref={this.refs.myRef}
        // autoFocus={name === 'name' ? true : false} 
      />
    )
  }
  
}

RFReactSelect.propTypes = {
  input: PropTypes.object,
  options: PropTypes.array,
  className: PropTypes.string,

}

export const RFReactMultiSelect = ({ input, options, className }) => {
  const { name, value, onBlur, onChange, onFocus } = input
  return (
    <Select
      valueKey="value"
      name={name}
      value={value}
      isMulti
      options={options}
      onChange={onChange}
      onBlur={() => onBlur(value)}
      onFocus={onFocus}
      className={className}
      {...selectMenuProps}
    />
  )
}

RFReactMultiSelect.propTypes = {
  input: PropTypes.object,
  options: PropTypes.array,
  className: PropTypes.string,

}

