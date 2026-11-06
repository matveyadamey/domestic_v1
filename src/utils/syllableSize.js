/**
 * Kruk glyph box height (px) for the former discrete .sizeN classes.
 * Values between the points are interpolated linearly so the size slider
 * can move continuously.
 */
const SYMBOL_HEIGHTS = [
  [30, 40],
  [40, 40],
  [50, 65],
  [60, 80],
  [70, 90],
  [80, 100],
]

export const symbolHeightPx = (fontSize) => {
  const size = Number(fontSize) || 40
  const first = SYMBOL_HEIGHTS[0]
  const last = SYMBOL_HEIGHTS[SYMBOL_HEIGHTS.length - 1]
  if (size <= first[0]) return first[1]
  if (size >= last[0]) return last[1]
  for (let i = 1; i < SYMBOL_HEIGHTS.length; i += 1) {
    const [s1, h1] = SYMBOL_HEIGHTS[i]
    if (size <= s1) {
      const [s0, h0] = SYMBOL_HEIGHTS[i - 1]
      return h0 + (((h1 - h0) * (size - s0)) / (s1 - s0))
    }
  }
  return last[1]
}

/** CSS custom properties consumed by `.syllable > .symbol` / `.text`. */
export const syllableSizeStyle = (fontSize, textSize) => {
  const size = Number(fontSize) || 40
  const style = {
    '--symbol-font-size': `${size}pt`,
    '--symbol-height': `${symbolHeightPx(size)}px`,
  }
  if (textSize != null) {
    style['--underlay-text-size'] = `${Number(textSize) || 16}pt`
  }
  return style
}
