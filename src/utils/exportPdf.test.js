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

import { saveAs } from 'file-saver'
import { exportPagesToPdf } from './exportPdf'

if (!Element.prototype.closest) {
  Element.prototype.closest = function closest(selector) {
    let el = this
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(selector)) return el
      el = el.parentElement || el.parentNode
    }
    return null
  }
}

function makePage() {
  const page = document.createElement('div')
  page.className = 'a4'
  const btn = document.createElement('button')
  btn.className = 'syllable-button'
  btn.textContent = 'x'
  page.appendChild(btn)
  return page
}

describe('exportPagesToPdf', () => {
  let area

  beforeEach(() => {
    saveAs.mockClear()
    area = document.createElement('div')
    area.className = 'paperArea'
    area.appendChild(makePage())
    document.body.appendChild(area)
    delete window.showSaveFilePicker
  })

  afterEach(() => {
    if (area && area.parentNode) {
      area.parentNode.removeChild(area)
    }
  })

  it('rejects when there are no pages', () => {
    area.parentNode.removeChild(area)
    area = null
    return exportPagesToPdf().then(
      () => {
        throw new Error('expected reject')
      },
      (err) => {
        expect(err.message).toMatch(/Нет страниц/)
      },
    )
  })

  it('falls back to saveAs when File System Access API is unavailable', () => {
    return exportPagesToPdf('test.pdf').then((result) => {
      expect(result).toBe(true)
      expect(saveAs).toHaveBeenCalled()
      expect(saveAs.mock.calls[0][1]).toBe('test.pdf')
    })
  })

  it('returns null when user cancels native save picker', () => {
    window.showSaveFilePicker = jest.fn(() => Promise.resolve(null))
    return exportPagesToPdf('test.pdf').then((result) => {
      expect(result).toBeNull()
      expect(saveAs).not.toHaveBeenCalled()
    })
  })

  it('keeps original page UI after export', () => {
    return exportPagesToPdf('test.pdf').then(() => {
      expect(area.querySelector('.syllable-button')).toBeTruthy()
      expect(saveAs).toHaveBeenCalled()
    })
  })
})
