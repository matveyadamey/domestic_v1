jest.mock('file-saver', () => ({ saveAs: jest.fn() }), { virtual: true })
jest.mock('html-to-image', () => ({
  toPng: jest.fn(() => Promise.resolve('data:image/png;base64,xx')),
}), { virtual: true })
jest.mock('jspdf', () => {
  function JsPDF() {
    this.internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
        width: 210,
        height: 297,
      },
    }
    this.addPage = jest.fn()
    this.addImage = jest.fn()
    this.output = jest.fn(() => new ArrayBuffer(8))
  }
  return JsPDF
}, { virtual: true })

import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

it('renders without crashing', () => { // eslint-disable-line
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
  ReactDOM.unmountComponentAtNode(div)
})
