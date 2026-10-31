/** A real Wikipedia article to start a trail from, with one line on why it is worth following. */
export type Seed = { topic: string; hook: string }

export const SEEDS: Seed[] = [
  { topic: 'Tardigrade', hook: 'The animal that survives space' },
  { topic: 'Voynich manuscript', hook: 'A book no one can read' },
  { topic: 'Tunguska event', hook: 'The sky exploded over Siberia' },
  { topic: 'Brutalist architecture', hook: 'Concrete as a statement' },
  { topic: 'Antikythera mechanism', hook: 'An ancient computer from a shipwreck' },
  { topic: 'Kintsugi', hook: 'Mending pottery with gold' },
  { topic: 'Mycelium', hook: 'The internet beneath the forest' },
  { topic: 'Bioluminescence', hook: 'Life that makes its own light' },
  { topic: 'Aurora', hook: 'Charged particles painting the sky' },
  { topic: 'Silk Road', hook: 'Where the world traded' },
  { topic: 'Library of Alexandria', hook: 'The lost memory of antiquity' },
  { topic: 'Rosetta Stone', hook: 'The key to Egyptian hieroglyphs' },
  { topic: 'Krakatoa', hook: 'The loudest sound in recorded history' },
  { topic: "Fermat's Last Theorem", hook: 'A margin note that took 358 years' },
  { topic: 'Dead Sea Scrolls', hook: 'Found by a shepherd in a cave' },
  { topic: 'Stonehenge', hook: 'Stones dragged across Britain' },
  { topic: 'Marie Curie', hook: 'Two Nobel prizes, two sciences' },
  { topic: 'Ada Lovelace', hook: 'The first programmer, before computers' },
  { topic: 'Octopus', hook: 'Eight arms, three hearts' },
  { topic: 'Jazz', hook: 'Improvisation turned into a language' },
  { topic: 'Byzantine Empire', hook: 'Rome, a thousand years longer' },
  { topic: 'Origami', hook: 'One sheet, no cuts' },
  { topic: 'Sundial', hook: 'Telling time with a shadow' },
  { topic: 'Obsidian', hook: 'Volcanic glass sharper than steel' },
  { topic: 'Monsoon', hook: 'The wind that decides harvests' },
  { topic: 'Alchemy', hook: 'Chemistry before it had rules' },
  { topic: 'Cartography', hook: 'The art of deciding what to leave out' },
  { topic: 'Lighthouse', hook: 'A building that exists to be seen' },
  { topic: 'Black hole', hook: 'Gravity so strong light stays in' },
  { topic: 'Dodo', hook: 'Gone within a century of discovery' },
  { topic: 'Machu Picchu', hook: 'A city built to hide in the clouds' },
  { topic: 'Pompeii', hook: 'A Roman town frozen mid-day' },
  { topic: 'Chernobyl disaster', hook: 'The night a reactor failed' },
  { topic: 'Apollo 11', hook: 'Four days to another world' },
  { topic: 'Printing press', hook: 'Ideas learn to travel faster' },
  { topic: 'Enigma machine', hook: 'A cipher thought unbreakable' },
  { topic: 'Morse code', hook: 'A language made of clicks' },
  { topic: 'Bauhaus', hook: 'A school that redesigned everything' },
  { topic: 'Fibonacci sequence', hook: 'Numbers that grow like shells' },
  { topic: 'Tulip mania', hook: 'A flower that crashed an economy' },
  { topic: 'Kraken', hook: "The sea monster of sailors' tales" },
]

/**
 * Pick `count` different seeds at random, none from `avoid` (the ones already on show).
 * `rng` returns a number in [0, 1); pass a fixed one to get a repeatable hand.
 */
export function deal(count: number, rng: () => number = Math.random, avoid: Seed[] = []): Seed[] {
  const skip = new Set(avoid.map((s) => s.topic))
  const pool = SEEDS.filter((s) => !skip.has(s.topic))
  // Shuffle, then take the top: every seed is equally likely to be in the hand.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const [a, b] = [pool[i], pool[j]]
    if (a && b) [pool[i], pool[j]] = [b, a]
  }
  return pool.slice(0, count)
}
