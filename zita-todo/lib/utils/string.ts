/**
 * Removes diacritics (accents) from a string.
 * Useful for accent-insensitive search and comparison.
 *
 * Examples:
 * - removeAccents('Šmihulová') → 'Smihulova'
 * - removeAccents('Čaká na odpoveď') → 'Caka na odpoved'
 * - removeAccents('Úloha') → 'Uloha'
 *
 * Slovak diacritics handled:
 * á, ä → a | č → c | ď → d | é → e | í → i | ĺ, ľ → l
 * ň → n | ó, ô → o | ŕ → r | š → s | ť → t | ú → u | ý → y | ž → z
 */
export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Removes diacritics and converts to lowercase.
 * Useful for case-insensitive and accent-insensitive comparison.
 */
export function normalizeForSearch(str: string): string {
  return removeAccents(str).toLowerCase()
}

/**
 * Checks if a string contains another string (accent-insensitive).
 */
export function includesIgnoreAccents(text: string, search: string): boolean {
  return normalizeForSearch(text).includes(normalizeForSearch(search))
}
