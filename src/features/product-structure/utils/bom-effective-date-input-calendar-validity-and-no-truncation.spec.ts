import { describe, expect, it } from 'vitest'
import { bomSchema } from '../data/schema'
import { normalizeBOMControlFieldPatch } from './bom-control-normalization'
import {
  getBOMEffectiveDateCalendarSelection,
  parseBOMEffectiveDateInputToDateProtocol,
} from './bom-effective-date-input-and-calendar-date-protocol'

describe('BOM effective dates preserve calendar meaning and reject malformed input', () => {
  it.each([
    ['2020-01-15', '2020-01-15'],
    [' 2020/1/5 ', '2020-01-05'],
    ['20200115', '2020-01-15'],
    ['2024-02-29', '2024-02-29'],
    ['2000-2-29', '2000-02-29'],
    ['0001-01-01', '0001-01-01'],
    ['9999-12-31', '9999-12-31'],
    ['', ''],
  ])('normalizes %s to the date-only protocol %s', (text, expected) => {
    expect(parseBOMEffectiveDateInputToDateProtocol(text)).toBe(expected)
    expect(
      bomSchema.parse({ id: '', productId: 'product', effectiveFrom: text })
        .effectiveFrom
    ).toBe(expected)
  })

  it.each([
    '2023-02-29',
    '1900-02-29',
    '2020-04-31',
    '2020-13-01',
    '2020-00-01',
    '2020-01-00',
    '0000-01-01',
    '20-01-15',
    '01/15/2020',
    '2020/01-15',
    '2020-01-',
    '2020-01-15-extra',
    '2020-01-15T00:00:00Z',
  ])('rejects %s without rolling over, truncating or guessing', (text) => {
    expect(parseBOMEffectiveDateInputToDateProtocol(text)).toBeNull()
    expect(
      bomSchema.safeParse({ id: '', productId: 'product', effectiveFrom: text })
        .success
    ).toBe(false)
    expect(
      normalizeBOMControlFieldPatch({ effectiveFrom: text }).effectiveFrom
    ).toBe(text)
  })

  it.each(['0001-01-01', '1990-12-31', '2024-02-29', '9999-12-31'])(
    'uses the same local calendar day for %s',
    (text) => {
      const selected = getBOMEffectiveDateCalendarSelection(text)!
      expect([
        selected.getFullYear(),
        selected.getMonth() + 1,
        selected.getDate(),
      ]).toEqual(text.split('-').map(Number))
    }
  )
})
