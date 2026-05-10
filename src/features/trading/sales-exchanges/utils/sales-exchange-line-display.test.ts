import { describe, expect, it } from 'vitest'
import {
  resolveSalesExchangeLineDisplaySubtitle,
  resolveSalesExchangeLineDisplayTitle,
} from './sales-exchange-line-display'

describe('sales-exchange-line-display', () => {
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

    expect(resolveSalesExchangeLineDisplayTitle(line)).toBe('Fork Alpha')
    expect(resolveSalesExchangeLineDisplaySubtitle(line)).toBe('trail/disc/v2')
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

    expect(resolveSalesExchangeLineDisplayTitle(line)).toBe('订单行 2')
    expect(resolveSalesExchangeLineDisplaySubtitle(line)).toBe('--')
  })
})
