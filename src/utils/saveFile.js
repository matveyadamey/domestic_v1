import { saveAs } from 'file-saver'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs'

function isTauriRuntime() {
  return typeof window !== 'undefined' && !!(
    window.__TAURI_INTERNALS__ ||
    window.__TAURI__ ||
    window.__TAURI_METADATA__
  )
}

function toBytes(data) {
  if (typeof data !== 'string') {
    return data instanceof Uint8Array ? data : new Uint8Array(data)
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(data)
  }
  // jsdom / old environments without TextEncoder
  const utf8 = unescape(encodeURIComponent(data))
  const arr = new Uint8Array(utf8.length)
  for (let i = 0; i < utf8.length; i += 1) {
    arr[i] = utf8.charCodeAt(i)
  }
  return arr
}

/**
 * Native Save As dialog + write bytes/text.
 * Tauri: dialog + fs. Browser: showSaveFilePicker, else file-saver download.
 * @returns {Promise<boolean>} true if saved, false if cancelled
 */
export function saveWithDialog({
  defaultName,
  data,
  mimeType = 'application/octet-stream',
  filters,
}) {
  const bytes = toBytes(data)

  if (isTauriRuntime()) {
    return saveWithTauri({ defaultName, data, bytes, filters })
  }

  return saveWithBrowser({ defaultName, data, bytes, mimeType, filters })
}

function saveWithTauri({ defaultName, data, bytes, filters }) {
  return save({
    defaultPath: defaultName,
    filters: filters || [{ name: 'All files', extensions: ['*'] }],
  }).then((path) => {
    if (!path) return false
    if (typeof data === 'string') {
      return writeTextFile(path, data).then(() => true)
    }
    return writeFile(path, bytes).then(() => true)
  })
}

function saveWithBrowser({ defaultName, data, bytes, mimeType, filters }) {
  if (typeof window.showSaveFilePicker === 'function') {
    const types = (filters || []).map((f) => {
      const exts = (f.extensions || []).map((e) => (e.startsWith('.') ? e : `.${e}`))
      const accept = {}
      if (exts.indexOf('.json') !== -1) accept['application/json'] = exts
      else if (exts.indexOf('.pdf') !== -1) accept['application/pdf'] = exts
      else accept[mimeType] = exts.length ? exts : ['.*']
      return { description: f.name || 'File', accept }
    })

    return window.showSaveFilePicker({
      suggestedName: defaultName,
      types: types.length ? types : undefined,
    }).then((handle) => {
      if (!handle) return false
      return handle.createWritable().then((writable) => (
        Promise.resolve(writable.write(typeof data === 'string' ? data : bytes))
          .then(() => writable.close())
          .then(() => true)
      ))
    }).catch((err) => {
      if (err && err.name === 'AbortError') return false
      const blob = new Blob([typeof data === 'string' ? data : bytes], { type: mimeType })
      saveAs(blob, defaultName)
      return true
    })
  }

  const blob = new Blob([typeof data === 'string' ? data : bytes], { type: mimeType })
  saveAs(blob, defaultName)
  return Promise.resolve(true)
}
