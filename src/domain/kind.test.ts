import { pickKind } from './kind'

it('maps Wikidata classes to a kind, defaulting to thing', () => {
  expect(pickKind(['Q5'])).toBe('person')
  expect(pickKind(['Q486972'])).toBe('place')
  expect(pickKind(['Q10931'])).toBe('event')
  expect(pickKind(['Q151885'])).toBe('idea')
  expect(pickKind([])).toBe('thing')
  expect(pickKind(['Q999999'])).toBe('thing')
})

it('prefers person over event over place over idea when several match', () => {
  expect(pickKind(['Q151885', 'Q5'])).toBe('person')
  expect(pickKind(['Q2221906', 'Q1656682'])).toBe('event')
  expect(pickKind(['Q151885', 'Q2221906'])).toBe('place')
})
