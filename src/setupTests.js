// CRA loads this before each test file (react-scripts).
const store = {}

const localStorageMock = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
  },
  setItem(key, value) {
    store[key] = String(value)
  },
  removeItem(key) {
    delete store[key]
  },
  clear() {
    Object.keys(store).forEach((key) => {
      delete store[key]
    })
  },
}

global.localStorage = localStorageMock
if (typeof window !== 'undefined') {
  window.localStorage = localStorageMock
}
