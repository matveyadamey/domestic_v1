import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import { initPreventOverscroll } from './utils/preventOverscroll'
import registerServiceWorker from './registerServiceWorker'

initPreventOverscroll()

ReactDOM.render(<App />, document.getElementById('root'))
registerServiceWorker()
