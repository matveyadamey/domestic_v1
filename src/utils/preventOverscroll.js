const CONTROL_SELECTOR = '.control'

function hasScrollableOverflow(node) {
  if (!node || node.nodeType !== 1) {
    return false
  }

  const overflowY = window.getComputedStyle(node).overflowY
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
}

function canScrollVertically(node) {
  return hasScrollableOverflow(node) && node.scrollHeight > node.clientHeight + 1
}

function findScrollableAncestor(target, stopAt) {
  let node = target

  while (node && node !== stopAt && node !== document.documentElement) {
    if (canScrollVertically(node)) {
      return node
    }
    node = node.parentElement
  }

  return null
}

function findControlScrollTarget(target) {
  const control = target.closest(CONTROL_SELECTOR)
  if (!control) {
    return null
  }

  const symbolsArea = target.closest('.currentSymbolsArea')
  if (symbolsArea) {
    return symbolsArea
  }

  const symbolsBlock = target.closest('.currentSymbols')
  if (symbolsBlock) {
    return symbolsBlock.querySelector('.currentSymbolsArea') || symbolsBlock
  }

  const inner = findScrollableAncestor(target, control)
  if (inner) {
    return inner
  }

  if (canScrollVertically(control)) {
    return control
  }

  const block = target.closest('.control-block')
  if (block && canScrollVertically(block)) {
    return block
  }

  return null
}

function canScrollHorizontally(node) {
  return node && node.scrollWidth > node.clientWidth + 1
}

function applyHorizontalScroll(node, delta) {
  if (!delta || !canScrollHorizontally(node)) {
    return false
  }

  const maxScrollLeft = node.scrollWidth - node.clientWidth
  const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, node.scrollLeft + delta))

  if (nextScrollLeft === node.scrollLeft) {
    return false
  }

  node.scrollLeft = nextScrollLeft
  return true
}

function handleControlHorizontalWheel(e, control) {
  const horizontalDelta = e.deltaX !== 0 ? e.deltaX : (e.shiftKey ? e.deltaY : 0)

  if (horizontalDelta && applyHorizontalScroll(control, horizontalDelta)) {
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  if (e.deltaY && applyHorizontalScroll(control, e.deltaY)) {
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  return false
}

function handleWheelOnElement(e, scrollable, control) {
  if (control && handleControlHorizontalWheel(e, control)) {
    return
  }

  if (!scrollable) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

  const { scrollTop, scrollHeight, clientHeight } = scrollable
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1
  const canScroll = scrollHeight > clientHeight + 1

  if (canScroll) {
    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
      e.preventDefault()
      e.stopPropagation()
      scrollable.scrollTop += e.deltaY
      return
    }
  }

  if (control && handleControlHorizontalWheel(e, control)) {
    return
  }

  e.preventDefault()
  e.stopPropagation()
}

function clampScrollTop(node) {
  if (!node || typeof node.scrollTop !== 'number') {
    return
  }

  if (node.scrollTop < 0) {
    node.scrollTop = 0
  }
}

function onWheel(e) {
  const control = e.target.closest(CONTROL_SELECTOR)

  if (control) {
    handleWheelOnElement(e, findControlScrollTarget(e.target), control)
    return
  }

  const scrollable = findScrollableAncestor(e.target, document.documentElement)

  if (!scrollable || !scrollable.classList.contains('paperArea')) {
    e.preventDefault()
    return
  }

  const { scrollTop, scrollHeight, clientHeight } = scrollable
  const atTop = scrollTop <= 0
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1

  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function onScroll(e) {
  const target = e.target

  if (target === document || target === document.documentElement) {
    if (document.documentElement.scrollTop !== 0) {
      document.documentElement.scrollTop = 0
    }
    if (document.body.scrollTop !== 0) {
      document.body.scrollTop = 0
    }
    return
  }

  clampScrollTop(target)
}

export function initPreventOverscroll() {
  document.addEventListener('wheel', onWheel, { passive: false, capture: true })
  document.addEventListener('scroll', onScroll, { passive: true, capture: true })

  const lockDocumentScroll = () => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  lockDocumentScroll()
  window.addEventListener('resize', lockDocumentScroll)

  return () => {
    document.removeEventListener('wheel', onWheel, { capture: true })
    document.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', lockDocumentScroll)
  }
}
