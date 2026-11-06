/**
 * Old Church Slavonic drop capitals.
 *
 * NewDamaskin is legacy-encoded: the Old Slavonic capitals are drawn in place
 * of Russian ones (И → Ї, Е → Ѣ …), and the font has no glyphs at their real
 * Unicode code points. A bucvica stores the real character (Ї), plain Russian
 * letters stay Russian (И), and rendering maps Old Slavonic back to the
 * legacy slot.
 *
 * Key: Russian letter on the same key (typed with Alt). Value: Old Slavonic.
 */
export const OLD_SLAVONIC_BY_KEY = {
  Е: 'Ѣ', // Ѣ ять
  З: 'Ѕ', // Ѕ зело
  И: 'Ї', // Ї і десятеричное
  О: 'Ꙍ', // Ꙍ широкое о
  П: 'Ѱ', // Ѱ пси
  У: 'Ꙋ', // Ꙋ ук
  Ф: 'Ѯ', // Ѯ кси
  Ш: 'Ѡ', // Ѡ омега
  Э: 'Є', // Є есть широкий
  Ю: 'Ѵ', // Ѵ ижица
  Я: 'Ѧ', // Ѧ юс малый
}

/** KeyboardEvent.code → Russian letter (ЙЦУКЕН), so Alt works in any layout. */
const KEY_BY_CODE = {
  KeyT: 'Е',
  KeyP: 'З',
  KeyB: 'И',
  KeyJ: 'О',
  KeyG: 'П',
  KeyE: 'У',
  KeyA: 'Ф',
  KeyI: 'Ш',
  Quote: 'Э',
  Period: 'Ю',
  KeyZ: 'Я',
}

const LEGACY_BY_OLD_SLAVONIC = Object.keys(OLD_SLAVONIC_BY_KEY).reduce(
  (acc, key) => ({ ...acc, [OLD_SLAVONIC_BY_KEY[key]]: key }),
  {},
)

/** Old Slavonic letter for an Alt+key event, or null if the key has none. */
export const oldSlavonicFromKeyEvent = (e) => {
  if (!e || !e.altKey || e.ctrlKey || e.metaKey) return null
  // React 16 synthetic events have no `code` — read it from the native event
  const code = e.code || (e.nativeEvent && e.nativeEvent.code)
  const key = KEY_BY_CODE[code]
    || (typeof e.key === 'string' ? e.key.toUpperCase() : '')
  return OLD_SLAVONIC_BY_KEY[key] || null
}

/** Character to draw in NewDamaskin for an Old Slavonic letter, else null. */
export const legacyGlyphFor = letter => LEGACY_BY_OLD_SLAVONIC[letter] || null
