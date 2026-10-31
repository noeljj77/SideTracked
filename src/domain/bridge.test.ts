import { describe, expect, it } from 'vitest'
import { isBoilerplate, rankChains, rankMeetingPoints } from './bridge'

describe('isBoilerplate', () => {
  it('flags citation plumbing, years and list pages', () => {
    for (const t of [
      'ISBN (identifier)',
      'Doi (identifier)',
      'Wayback Machine',
      '1815',
      '44 BC',
      'List of wars',
      'Outline of jazz',
      'Mercury (disambiguation)',
    ]) {
      expect(isBoilerplate(t), t).toBe(true)
    }
  })

  it('keeps real topics, including ones that start like boilerplate', () => {
    for (const t of [
      'Ancient Greece',
      'Napoleon',
      'Springer Mountain',
      '1815 eruption of Mount Tambora',
    ]) {
      expect(isBoilerplate(t), t).toBe(false)
    }
  })
})

describe('rankMeetingPoints', () => {
  it('puts topics both articles mention first and keeps the order within each group', () => {
    const found = ['Latin', 'Ancient Greece', 'Crete', 'Aristotle']
    const linkedByA = ['Latin', 'Aristotle', 'Crete']
    const linkedByB = ['Aristotle', 'Ancient Greece', 'Crete']
    expect(rankMeetingPoints(found, linkedByA, linkedByB)).toEqual([
      'Crete',
      'Aristotle',
      'Latin',
      'Ancient Greece',
    ])
  })

  it('returns an empty list when nothing was found', () => {
    expect(rankMeetingPoints([], ['a'], ['b'])).toEqual([])
  })
})

describe('fame', () => {
  const size = (t: string) => ({ Obscure: 800, Greece: 120_000, USA: 900_000 })[t] ?? 0

  it('puts well-known stepping stones before obscure ones inside each group', () => {
    expect(rankMeetingPoints(['Obscure', 'USA', 'Greece'], [], [], size)).toEqual([
      'Greece',
      'USA',
      'Obscure',
    ])
  })

  it('orders two-stone chains by how well known both stones are', () => {
    const pairs: [string, string][] = [
      ['Obscure', 'Obscure'],
      ['Greece', 'Greece'],
    ]
    expect(rankChains(pairs, size)).toEqual([
      ['Greece', 'Greece'],
      ['Obscure', 'Obscure'],
    ])
  })
})
