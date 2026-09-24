import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { saveWithDialog } from './saveFile'

const UI_SELECTORS = [
  '.page-remove-button',
  '.paragraph-remove-button',
  '.syllable-button',
  '.bucvica-button',
  '.text-remove-button',
  '.add-page',
]

/**
 * Copy on-screen box of each matched element onto the clone (no transforms).
 * Keeps clef/staff aligned the same in PDF as in the app.
 */
function bakeScreenPositions(originalRoot, cloneRoot, selector, referenceSelector) {
  const originals = originalRoot.querySelectorAll(selector)
  const clones = cloneRoot.querySelectorAll(selector)

  for (let i = 0; i < clones.length; i += 1) {
    const orig = originals[i]
    const clone = clones[i]
    if (!orig || !clone) continue

    const origRef = orig.closest(referenceSelector)
    const cloneRef = clone.closest(referenceSelector)
    if (!origRef || !cloneRef) continue

    const refRect = origRef.getBoundingClientRect()
    const elRect = orig.getBoundingClientRect()

    clone.style.top = `${elRect.top - refRect.top}px`
    clone.style.left = `${elRect.left - refRect.left}px`
    clone.style.right = 'auto'
    clone.style.bottom = 'auto'
    clone.style.transform = 'none'
    clone.style.webkitTransform = 'none'
    // Staff lines keep box size; text clef must not get a clipped height
    if (selector !== '.paragraph-clef') {
      clone.style.width = `${elRect.width}px`
      clone.style.height = `${elRect.height}px`
    }
  }
}

/** Tighten accidental↔note gap only in the PDF clone (screen stays at −8px). */
function tightenAccidentalsForPdf(cloneRoot) {
  Array.from(cloneRoot.querySelectorAll('.b-acc')).forEach((el) => {
    el.style.setProperty('transform', 'translateX(calc(-50% - 2px))', 'important')
    el.style.setProperty('-webkit-transform', 'translateX(calc(-50% - 2px))', 'important')
  })
}

function cleanClone(page) {
  const clone = page.cloneNode(true)
  UI_SELECTORS.forEach((selector) => {
    Array.from(clone.querySelectorAll(selector)).forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })
  })
  clone.classList.remove('activePage')
  Object.assign(clone.style, {
    boxShadow: 'none',
    border: 'none',
    margin: '0',
    position: 'relative',
  })

  // Bake live on-screen geometry into the clone for html2canvas
  bakeScreenPositions(page, clone, '.paragraph-clef', '.paragraph-staff')
  bakeScreenPositions(page, clone, '.paragraph-staff-lines', '.paragraph-staff')
  tightenAccidentalsForPdf(clone)

  return clone
}

function pickSaveFile(defaultName) {
  // Kept for API compatibility; real save goes through saveWithDialog.
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
  const host = document.createElement('div')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '210mm',
    background: '#fff',
    zIndex: '-1',
  })
  document.body.appendChild(host)

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth
    ? pdf.internal.pageSize.getWidth()
    : pdf.internal.pageSize.width
  const pageHeight = pdf.internal.pageSize.getHeight
    ? pdf.internal.pageSize.getHeight()
    : pdf.internal.pageSize.height

  let chain = Promise.resolve()

  pages.forEach((page, index) => {
    chain = chain.then(() => {
      const clone = cleanClone(page)
      host.innerHTML = ''
      host.appendChild(clone)

      return html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (index > 0) {
          pdf.addPage()
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)
      })
    })
  })

  return chain.then(() => {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
    return pdf
  }, (err) => {
    if (host.parentNode) {
      host.parentNode.removeChild(host)
    }
    throw err
  })
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
