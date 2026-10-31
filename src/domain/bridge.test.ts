import { describe, expect, it } from 'vitest'
import { isBoilerplate, rankMeetingPoints } from './bridge'

describe('isBoilerplate', () => {
  it('flags citation plumbing, years and list pages', () => {
    for (const t of ['ISBN (identifier)', 'Doi (identifier)', 'Wayback Machine', '1815', '44 BC', 'List of wars', 'Mercury (disambiguation)']) {
      expect(isBoilerplate(t), t).toBe(true)
    }
  })

  it('keeps real topics, including ones that start like boilerplate', () => {
    for (const t of ['Ancient Greece', 'Napoleon', 'Springer Mountain', '1815 eruption of Mount Tambora']) {
      expect(isBoilerplate(t), t).toBe(false)
    }
  })
})

describe('rankMeetingPoints', () => {
  it('puts topics both articles mention first and keeps the order within each group', () => {
    const found = ['Latin', 'Ancient Greece', 'Crete', 'Aristotle']
    const linkedByA = ['Latin', 'Aristotle', 'Crete']
    const linkedByB = ['Aristotle', 'Ancient Greece', 'Crete']
    expect(rankMeetingPoints(found, linkedByA, linkedByB)).toEqual(['Crete', 'Aristotle', 'Latin', 'Ancient Greece'])
  })

  it('returns an empty list when nothing was found', () => {
    expect(rankMeetingPoints([], ['a'], ['b'])).toEqual([])
  })
})
