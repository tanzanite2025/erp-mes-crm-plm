import { describe, expect, it } from 'vitest'
import {
  resolveSalesReturnLineDisplaySubtitle,
  resolveSalesReturnLineDisplayTitle,
} from './sales-return-line-display'

describe('sales-return-line-display', () => {
  it('prefers snapshot title and subtitle when present', () => {
    const line = {
      lineNo: 1,
      productCode: 'PC-1',
      productModel: 'PM-1',
      specification: 'Spec',
      description: 'Desc',
      productDisplayTitleSnapshot: 'Fork Alpha',
      productDisplaySubtitleSnapshot: 'trail/disc/v2',
      productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
    }

    expect(resolveSalesReturnLineDisplayTitle(line)).toBe('Fork Alpha')
    expect(resolveSalesReturnLineDisplaySubtitle(line)).toBe('trail/disc/v2')
  })

  it('falls back to placeholders when snapshots are missing', () => {
    const line = {
      lineNo: 2,
      productCode: 'PC-2',
      productModel: 'PM-2',
      specification: 'Spec B',
      description: 'Desc B',
      productDisplayTitleSnapshot: '',
      productDisplaySubtitleSnapshot: '',
      productDisplayFullLabelSnapshot: '',
    }

    expect(resolveSalesReturnLineDisplayTitle(line)).toBe('退货行 2')
    expect(resolveSalesReturnLineDisplaySubtitle(line)).toBe('--')
  })
})
