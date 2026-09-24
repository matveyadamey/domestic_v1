import { saveAs } from 'file-saver'

function isTauriRuntime() {
  return typeof window !== 'undefined' && !!(
    window.__TAURI_INTERNALS__ ||
    window.__TAURI__ ||
    window.__TAURI_METADATA__
  )
}

/** Call Tauri IPC without bundling @tauri-apps/* (CRA 1 can't parse their modern JS). */
function tauriInvoke(cmd, args) {
  const core = window.__TAURI__ && window.__TAURI__.core
  if (!core || typeof core.invoke !== 'function') {
    return Promise.reject(new Error('Tauri core.invoke is not available'))
  }
  return core.invoke(cmd, args)
}

function toBytes(data) {
  if (typeof data !== 'string') {
    return data instanceof Uint8Array ? data : new Uint8Array(data)
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(data)
  }
  const utf8 = unescape(encodeURIComponent(data))
  const arr = new Uint8Array(utf8.length)
  for (let i = 0; i < utf8.length; i += 1) {
    arr[i] = utf8.charCodeAt(i)
  }
  return arr
}

/**
 * Native Save As dialog + write bytes/text.
 * Tauri: dialog + fs via global invoke. Browser: showSaveFilePicker, else file-saver.
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
  return tauriInvoke('plugin:dialog|save', {
    options: {
      defaultPath: defaultName,
      filters: filters || [{ name: 'All files', extensions: ['*'] }],
    },
  }).then((path) => {
    if (!path) return false
    if (typeof data === 'string') {
      return tauriInvoke('plugin:fs|write_text_file', {
        path: path,
        data: data,
      }).then(() => true)
    }
    const list = []
    for (let i = 0; i < bytes.length; i += 1) {
      list.push(bytes[i])
    }
    return tauriInvoke('plugin:fs|write_file', {
      path: path,
      data: list,
    }).then(() => true)
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
