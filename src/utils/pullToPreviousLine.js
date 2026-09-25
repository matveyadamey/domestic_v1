/**
 * How many leading syllables fit into freeWidth (px), given their layout widths.
 */
export function countFittingSyllables(widths, freeWidth) {
  if (!Array.isArray(widths) || freeWidth == null || freeWidth <= 0) return 0
  let left = freeWidth
  let n = 0
  for (let i = 0; i < widths.length; i += 1) {
    const w = Number(widths[i]) || 0
    if (w <= left + 0.5) {
      left -= w
      n += 1
    } else {
      break
    }
  }
  return n
}

/**
 * Free px on the last visual row of a .paragraph element.
 */
export function remainingWidthOnLastRow(paraEl) {
  if (!paraEl) return 0
  const style = window.getComputedStyle(paraEl)
  const padLeft = parseFloat(style.paddingLeft) || 0
  const padRight = parseFloat(style.paddingRight) || 0
  const contentWidth = paraEl.clientWidth - padLeft - padRight
  if (contentWidth <= 0) return 0

  const items = Array.from(paraEl.querySelectorAll('[data-paginate-item="1"]'))
  if (!items.length) return contentWidth

  const paraRect = paraEl.getBoundingClientRect()
  const tops = items.map(el => el.getBoundingClientRect().top)
  const lastTop = Math.max(...tops)
  const lastRow = items.filter((_, i) => Math.abs(tops[i] - lastTop) < 12)
  if (!lastRow.length) return contentWidth

  const last = lastRow[lastRow.length - 1]
  const lastRight = last.getBoundingClientRect().right
  const contentRight = paraRect.left + padLeft + contentWidth
  return Math.max(0, contentRight - lastRight)
}

/**
 * Outer width of a syllable column including horizontal margin.
 */
export function syllableLayoutWidth(el) {
  if (!el) return 0
  const style = window.getComputedStyle(el)
  const ml = parseFloat(style.marginLeft) || 0
  const mr = parseFloat(style.marginRight) || 0
  return el.getBoundingClientRect().width + ml + mr
}

/**
 * Find .paragraph DOM node for page/paragraph indices.
 */
export function findParagraphElement(pageIndex, paragraphIndex) {
  const pages = document.querySelectorAll('.a4')
  const pageEl = pages[pageIndex]
  if (!pageEl) return null
  const paras = pageEl.querySelectorAll('.paragraph')
  return paras[paragraphIndex] || null
}
