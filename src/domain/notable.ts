/**
 * How worth showing an article is by its size in characters: a mid-large article beats a country or a stub.
 * shortcut: size is a rough stand-in for fame, upgrade to page views if results feel random.
 */
export const notable = (length: number) =>
  Math.exp(-((Math.log10(Math.max(length, 1)) - Math.log10(120_000)) ** 2) / (2 * 0.35 ** 2))
