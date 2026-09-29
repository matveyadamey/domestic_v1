/** Suppress item click right after a drag-select (mouseup also fires click). */
let suppressUntil = 0

export const markDragSelectDone = () => {
  suppressUntil = Date.now() + 200
}

export const shouldSuppressItemClick = () => Date.now() < suppressUntil

export const parsePaginateItem = (el) => {
  if (!el || !el.getAttribute) return null
  const pageIndex = parseInt(el.getAttribute('data-page'), 10)
  const paragraphIndex = parseInt(el.getAttribute('data-paragraph'), 10)
  const index = parseInt(el.getAttribute('data-index'), 10)
  if (Number.isNaN(pageIndex) || Number.isNaN(paragraphIndex) || Number.isNaN(index)) {
    return null
  }
  return { pageIndex, paragraphIndex, index }
}

export const paginateItemFromPoint = (x, y) => {
  if (typeof document === 'undefined') return null
  const el = document.elementFromPoint(x, y)
  if (!el || !el.closest) return null
  const item = el.closest('[data-paginate-item="1"]')
  return item ? parsePaginateItem(item) : null
}
