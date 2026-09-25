// Use CJS/ES5 build — CRA 1 uglify cannot minify the package `es/` (e.g. `**`)
import { toPng } from 'html-to-image/lib'
import jsPDF from 'jspdf'
import { saveWithDialog } from './saveFile'

/** Class names stripped from the capture (UI chrome, not score content). */
const HIDDEN_UI_CLASSES = [
  'page-remove-button',
  'paragraph-remove-button',
  'syllable-button',
  'bucvica-button',
  'text-remove-button',
  'add-page',
  'insert-caret',
  'insert-caret-end',
]

/**
 * Why not html2canvas: it re-rasterizes web fonts with its own baseline math.
 * Staff lines are CSS borders (correct), Bravura notes shift by ~one step.
 * html-to-image uses SVG foreignObject → the browser paints fonts as on screen.
 */
function shouldIncludeNode(node) {
  if (!node || node.nodeType !== 1 || !node.classList) return true
  for (let i = 0; i < HIDDEN_UI_CLASSES.length; i += 1) {
    if (node.classList.contains(HIDDEN_UI_CLASSES[i])) return false
  }
  return true
}

function capturePage(page) {
  const prevShadow = page.style.boxShadow
  const prevBorder = page.style.border
  page.classList.remove('activePage')
  page.style.boxShadow = 'none'
  page.style.border = 'none'

  const fontsReady = (document.fonts && document.fonts.ready)
    ? document.fonts.ready
    : Promise.resolve()

  return fontsReady
    .then(() => toPng(page, {
      pixelRatio: 4,
      backgroundColor: '#ffffff',
      cacheBust: true,
      filter: shouldIncludeNode,
    }))
    .then((dataUrl) => {
      page.style.boxShadow = prevShadow
      page.style.border = prevBorder
      return dataUrl
    }, (err) => {
      page.style.boxShadow = prevShadow
      page.style.border = prevBorder
      throw err
    })
}

function pickSaveFile(defaultName) {
  if (typeof window.showSaveFilePicker !== 'function') {
    return Promise.resolve(null)
  }

  return window.showSaveFilePicker({
    suggestedName: defaultName,
    types: [
      {
        description: 'PDF документ',
        accept: { 'application/pdf': ['.pdf'] },
      },
    ],
  }).catch((err) => {
    if (err && err.name === 'AbortError') {
      return null
    }
    throw err
  })
}

function buildPdfFromPages(pages) {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth
    ? pdf.internal.pageSize.getWidth()
    : pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.getHeight
    ? pdf.internal.pageSize.getHeight()
    : pdf.internal.pageSize.height

  let chain = Promise.resolve()

  pages.forEach((page, index) => {
    chain = chain.then(() => capturePage(page).then((imgData) => {
      if (index > 0) {
        pdf.addPage()
      }
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight)
    }))
  })

  return chain.then(() => pdf)
}

/**
 * Export A4 pages to PDF with a native Save As dialog when available.
 * Browser: dialog first (user gesture), then generate. Tauri: generate, then native dialog.
 */
export function exportPagesToPdf(defaultName = 'domestikos.pdf') {
  const pages = Array.from(document.querySelectorAll('.paperArea .a4'))
  if (!pages.length) {
    return Promise.reject(new Error('Нет страниц для экспорта'))
  }

  const filters = [{ name: 'PDF', extensions: ['pdf'] }]
  const inTauri = typeof window !== 'undefined' && !!(
    window.__TAURI_INTERNALS__ || window.__TAURI__ || window.__TAURI_METADATA__
  )

  if (inTauri) {
    return buildPdfFromPages(pages).then((pdf) => {
      const buffer = pdf.output('arraybuffer')
      return saveWithDialog({
        defaultName,
        data: new Uint8Array(buffer),
        mimeType: 'application/pdf',
        filters,
      })
    })
  }

  return pickSaveFile(defaultName).then((fileHandle) => {
    if (typeof window.showSaveFilePicker === 'function' && fileHandle === null) {
      return null
    }

    return buildPdfFromPages(pages).then((pdf) => {
      const buffer = pdf.output('arraybuffer')

      if (fileHandle) {
        return fileHandle.createWritable().then((writable) => (
          Promise.resolve(writable.write(buffer)).then(() => writable.close())
        ))
      }

      return saveWithDialog({
        defaultName,
        data: new Uint8Array(buffer),
        mimeType: 'application/pdf',
        filters,
      })
    })
  })
}
