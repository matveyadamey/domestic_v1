/**
 * Auto-paginate A4 sheets after layout (staff makes hook-only JSON taller).
 *
 * - Cut only on visual row boundaries (never mid-line).
 * - Spill the first row whose bottom exceeds the page content limit.
 * - Normalize removes duplicate kruk glyphs (same value back-to-back),
 *   common at old paragraph breaks (e.g. «-» + «го» both Подчашие Ми).
 */

const FOOTER_RESERVE_PX = 44
const OVERFLOW_TOLERANCE_PX = 24
/** Cluster syllables on the same flex wrap row (tops align under flex-start). */
const ROW_TOP_TOLERANCE_PX = 28

function pageContentLimit(pageEl) {
  const pageRect = pageEl.getBoundingClientRect()
  const padBottom = parseFloat(window.getComputedStyle(pageEl).paddingBottom) || 0
  return pageRect.bottom - padBottom - FOOTER_RESERVE_PX
}

function layoutTop(el) {
  return el.getBoundingClientRect().top
}

function layoutBottom(el) {
  return el.getBoundingClientRect().bottom
}

function groupRows(items) {
  // Sort by top so clustering is stable regardless of DOM order
  const sorted = items.slice().sort((a, b) => layoutTop(a) - layoutTop(b))
  const rows = []
  sorted.forEach((el) => {
    const top = layoutTop(el)
    const row = rows.length ? rows[rows.length - 1] : null
    if (row && Math.abs(row.top - top) < ROW_TOP_TOLERANCE_PX) {
      row.items.push(el)
      row.top = Math.min(row.top, top)
    } else {
      rows.push({ top, items: [el] })
    }
  })
  return rows
}

function isDashText(text) {
  return text === '-' || text === '' || text == null
}

/**
 * Collapse pages into one sheet of paragraphs so pagination can reflow cleanly.
 */
export function flattenToOnePage(syllables) {
  if (!Array.isArray(syllables) || !syllables.length) return [[]]
  const paras = []
  syllables.forEach((page) => {
    if (!Array.isArray(page)) return
    page.forEach((para) => {
      if (Array.isArray(para) && para.length) paras.push(para)
    })
  })
  return paras.length ? [paras] : [[]]
}

/**
 * Remove back-to-back KRUKs with the same glyph HTML (value).
 * Keeps the syllable that has real text when the other is «-».
 * Walks across paragraph and page boundaries.
 */
export function normalizeSyllables(syllables) {
  if (!Array.isArray(syllables)) return syllables

  // Flatten to a single sequence with break markers, dedupe, rebuild.
  const flat = []
  syllables.forEach((page, pi) => {
    if (!Array.isArray(page)) return
    page.forEach((para, gi) => {
      if (!Array.isArray(para)) return
      para.forEach((s) => {
        flat.push({ kind: 'item', s, pi, gi })
      })
      flat.push({ kind: 'para-break' })
    })
    flat.push({ kind: 'page-break' })
  })

  const out = []
  let lastKrukValue = null

  flat.forEach((node) => {
    if (node.kind !== 'item') {
      out.push(node)
      // Keep lastKrukValue across para/page breaks — that is where dups appear
      return
    }

    const s = node.s
    if (s && s.type === 'KRUK' && typeof s.value === 'string') {
      // Fix export glitches like `<span <span class='red'>…`
      const fixed = s.value
        .replace(/<span\s+<span/gi, '<span')
        .replace(/<span<span/gi, '<span')
      if (fixed !== s.value) {
        node = { ...node, s: { ...s, value: fixed } }
      }
    }
    const item = node.s
    if (item.type === 'KRUK' && lastKrukValue !== null && item.value === lastKrukValue) {
      // Find previous item in out
      let prevIdx = out.length - 1
      while (prevIdx >= 0 && out[prevIdx].kind !== 'item') prevIdx -= 1
      const prev = prevIdx >= 0 ? out[prevIdx] : null

      if (prev && prev.s.type === 'KRUK' && prev.s.value === item.value) {
        if (isDashText(prev.s.text) && !isDashText(item.text)) {
          out.splice(prevIdx, 1) // drop «-», keep current
          out.push(node)
          lastKrukValue = item.value
          return
        }
        if (!isDashText(prev.s.text) && isDashText(item.text)) {
          return // drop dash duplicate, keep previous
        }
        if (isDashText(prev.s.text) && isDashText(item.text)) {
          return // drop second dash
        }
        // Same glyph + both have text: keep one (previous)
        return
      }
    }

    if (item.type === 'KRUK') lastKrukValue = item.value
    out.push(node)
  })

  // Rebuild pages/paragraphs
  const pages = [[]]
  let page = pages[0]
  let para = []

  const flushPara = () => {
    if (para.length) {
      page.push(para)
      para = []
    }
  }

  out.forEach((node) => {
    if (node.kind === 'item') {
      para.push(node.s)
      return
    }
    if (node.kind === 'para-break') {
      flushPara()
      return
    }
    if (node.kind === 'page-break') {
      flushPara()
      // ignore original page breaks when rebuilding into one flow;
      // flattenToOnePage already merged — here keep single page
    }
  })
  flushPara()

  if (!page.length) return [[]]
  return pages
}

/**
 * Prepare loaded JSON: one page, no duplicate kruk glyphs,
 * melisma («-») glued to the preceding text syllable's paragraph,
 * and popevka valueNotes stamped when glyph sequences match COMPOSITIONS.
 */
export function prepareLoadedSyllables(syllables) {
  return applyCompositionNotes(
    mergeMelismaParagraphs(normalizeSyllables(flattenToOnePage(syllables))),
  )
}

/**
 * When a loaded file has bare glyphs without notesFixed (export from
 * older builds / external editors), match COMPOSITIONS sequences and
 * attach valueNotes so тайнозамкнутые endings render.
 */
export function applyCompositionNotes(syllables, compositions = null) {
  if (!Array.isArray(syllables)) return syllables

  let comps = compositions
  if (!comps) {
    // Lazy require avoids circular import at module load in tests
    // eslint-disable-next-line global-require
    const { COMPOSITIONS } = require('../res/index')
    comps = COMPOSITIONS
  }

  const patterns = []
  comps.forEach((group) => {
    (group.value || []).forEach((comp) => {
      if (!comp || !Array.isArray(comp.value) || !Array.isArray(comp.valueNotes)) return
      if (comp.value.length !== comp.valueNotes.length) return
      if (!comp.valueNotes.some(n => n && n !== '###')) return
      patterns.push(comp)
    })
  })
  // Longer matches first (средняя before малая suffix)
  patterns.sort((a, b) => b.value.length - a.value.length)

  const pages = JSON.parse(JSON.stringify(syllables))
  pages.forEach((page) => {
    if (!Array.isArray(page)) return
    page.forEach((paragraph) => {
      if (!Array.isArray(paragraph)) return
      let i = 0
      while (i < paragraph.length) {
        let matched = false
        for (let p = 0; p < patterns.length; p += 1) {
          const comp = patterns[p]
          const len = comp.value.length
          if (i + len > paragraph.length) continue
          let ok = true
          for (let k = 0; k < len; k += 1) {
            const item = paragraph[i + k]
            const raw = item && item.value ? String(item.value) : ''
            const itemVal = raw
              .replace(/<span\s+<span/gi, '<span')
              .replace(/<span<span/gi, '<span')
            if (!item || item.type !== 'KRUK' || itemVal !== comp.value[k]) {
              ok = false
              break
            }
          }
          if (!ok) continue
          for (let k = 0; k < len; k += 1) {
            const note = comp.valueNotes[k]
            if (!note || note === '###') continue
            paragraph[i + k] = {
              ...paragraph[i + k],
              notes: note,
              notesFixed: true,
              name: paragraph[i + k].name || comp.name,
            }
          }
          i += len
          matched = true
          break
        }
        if (!matched) i += 1
      }
    })
  })
  return pages
}

/**
 * If a paragraph starts with textless melisma («-»), append it to the
 * previous paragraph so «тЕ» and the following chant stay on one flex row.
 */
export function mergeMelismaParagraphs(syllables) {
  if (!Array.isArray(syllables)) return syllables
  const pages = JSON.parse(JSON.stringify(syllables))

  pages.forEach((page) => {
    if (!Array.isArray(page)) return
    let i = 0
    while (i < page.length - 1) {
      const cur = page[i]
      const next = page[i + 1]
      if (!Array.isArray(cur) || !cur.length || !Array.isArray(next) || !next.length) {
        i += 1
        continue
      }
      const first = next[0]
      const nextStartsMelisma = first
        && first.type === 'KRUK'
        && isDashText(first.text)
      if (nextStartsMelisma) {
        page[i] = cur.concat(next)
        page.splice(i + 1, 1)
        continue
      }
      i += 1
    }
  })

  return pages
}

export function findSpillElement(pageEl) {
  if (!pageEl) return null

  const items = Array.from(pageEl.querySelectorAll('[data-paginate-item="1"]'))
  if (items.length < 2) return null

  const limit = pageContentLimit(pageEl)
  const rows = groupRows(items)

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowBottom = Math.max(...row.items.map(layoutBottom))
    // Fits on the page — keep going
    if (rowBottom <= limit + OVERFLOW_TOLERANCE_PX) continue
    // Never spill the first row (would empty the page)
    if (i === 0) return null
    // Spill from the first syllable of this overflowing row (whole row + rest of page)
    return row.items[0]
  }

  return null
}

function lastSyllableOfPage(page) {
  if (!page || !page.length) return null
  for (let p = page.length - 1; p >= 0; p -= 1) {
    const para = page[p]
    if (para && para.length) return para[para.length - 1]
  }
  return null
}

function firstSyllableOfPage(page) {
  if (!page || !page.length) return null
  for (let p = 0; p < page.length; p += 1) {
    if (page[p] && page[p].length) return page[p][0]
  }
  return null
}

function syllableKey(s) {
  if (!s) return ''
  return `${s.type || ''}|${s.value || ''}|${s.text || ''}`
}

/**
 * @returns {Array|null} new pages structure, or null if nothing to move
 */
export function spillSyllablesToNextPage(syllables, pageIndex, paragraphIndex, itemIndex) {
  if (!Array.isArray(syllables) || !syllables[pageIndex]) return null

  const pages = JSON.parse(JSON.stringify(syllables))
  const page = pages[pageIndex]
  if (!page[paragraphIndex]) return null

  let start = itemIndex
  let paraIndex = paragraphIndex
  let para = page[paraIndex]

  if (start > 0 && para[start - 1] && para[start - 1].type === 'BUCVICA') {
    start -= 1
  }

  // Melisma-only paragraph (starts with «-»): pull cut into previous paragraph
  // so «тЕ» + распев move together instead of leaving «те» alone on the line.
  if (
    start === 0
    && paraIndex > 0
    && para[0]
    && para[0].type === 'KRUK'
    && isDashText(para[0].text)
  ) {
    const prevPara = page[paraIndex - 1]
    if (prevPara && prevPara.length) {
      paraIndex -= 1
      para = prevPara
      start = prevPara.length // will expand back through lead syllable below
      // Attach current melisma para onto previous for a single cut
      page[paraIndex] = prevPara.concat(page[paragraphIndex])
      page.splice(paragraphIndex, 1)
      para = page[paraIndex]
      start = prevPara.length // first index of attached melisma
    }
  }

  start = expandSpillStartForMelisma(para, start)

  if (start <= 0 && paraIndex === 0) return null
  if (start < 0 || start >= para.length) return null

  const head = para.slice(0, start)
  const tail = para.slice(start)
  const followingParas = page.slice(paraIndex + 1)

  if (head.length) {
    pages[pageIndex] = [...page.slice(0, paraIndex), head]
  } else {
    pages[pageIndex] = page.slice(0, paraIndex)
  }

  const spillParas = []
  if (tail.length) spillParas.push(tail)
  followingParas.forEach((p) => {
    if (p && p.length) spillParas.push(p)
  })
  if (!spillParas.length) return null

  const next = pages[pageIndex + 1] ? pages[pageIndex + 1].slice() : []
  const spillFirst = spillParas[0][0]
  const nextFirst = firstSyllableOfPage(next)
  const headLast = lastSyllableOfPage(pages[pageIndex])

  if (
    spillFirst
    && spillFirst.type === 'KRUK'
    && headLast
    && headLast.type === 'KRUK'
    && spillFirst.value === headLast.value
  ) {
    spillParas[0] = spillParas[0].slice(1)
    if (!spillParas[0].length) spillParas.shift()
    if (!spillParas.length) {
      pages[pageIndex] = pages[pageIndex].filter(p => Array.isArray(p) && p.length > 0)
      return pages[pageIndex].length ? mergeMelismaParagraphs(pages) : null
    }
  }

  if (spillFirst && nextFirst && syllableKey(spillParas[0][0]) === syllableKey(nextFirst)) {
    pages[pageIndex] = pages[pageIndex].filter(p => Array.isArray(p) && p.length > 0)
    return pages[pageIndex].length ? mergeMelismaParagraphs(pages) : null
  }

  pages[pageIndex + 1] = [...spillParas, ...next]
  pages[pageIndex] = pages[pageIndex].filter(p => Array.isArray(p) && p.length > 0)
  if (!pages[pageIndex].length) return null

  return mergeMelismaParagraphs(normalizeSyllablesAcrossPages(pages))
}

/**
 * If the cut falls inside/at a «-» melisma, move the cut earlier so the
 * lead syllable (e.g. «тЕ») and the whole melisma travel together.
 */
function expandSpillStartForMelisma(para, start) {
  if (!para || start < 0 || start >= para.length) return start

  let i = start

  // Cut landed in/after a dash run — pull back through all dashes
  if (
    (para[i] && para[i].type === 'KRUK' && isDashText(para[i].text))
    || (i > 0 && para[i - 1] && para[i - 1].type === 'KRUK' && isDashText(para[i - 1].text))
  ) {
    while (i > 0 && para[i - 1] && para[i - 1].type === 'KRUK' && isDashText(para[i - 1].text)) {
      i -= 1
    }
    // Include lead syllable with real text before the melisma
    if (i > 0 && para[i - 1] && para[i - 1].type === 'KRUK' && !isDashText(para[i - 1].text)) {
      i -= 1
    }
  }

  return i
}

/** Light pass: remove same-value KRUK pairs at page boundaries only. */
function normalizeSyllablesAcrossPages(pages) {
  const copy = JSON.parse(JSON.stringify(pages))
  for (let pi = 0; pi < copy.length - 1; pi += 1) {
    const left = lastSyllableOfPage(copy[pi])
    const right = firstSyllableOfPage(copy[pi + 1])
    if (
      left && right
      && left.type === 'KRUK' && right.type === 'KRUK'
      && left.value === right.value
    ) {
      // Remove dash side, or the first on next page
      const nextPage = copy[pi + 1]
      for (let gi = 0; gi < nextPage.length; gi += 1) {
        if (nextPage[gi] && nextPage[gi].length) {
          if (isDashText(right.text) || !isDashText(left.text)) {
            nextPage[gi].shift()
            if (!nextPage[gi].length) nextPage.splice(gi, 1)
          } else {
            // remove left dash
            const page = copy[pi]
            for (let gj = page.length - 1; gj >= 0; gj -= 1) {
              if (page[gj] && page[gj].length) {
                page[gj].pop()
                if (!page[gj].length) page.splice(gj, 1)
                break
              }
            }
          }
          break
        }
      }
    }
  }
  return copy.filter(p => Array.isArray(p) && p.length > 0)
}
