import { describe, expect, it } from 'vitest'
import {
  formatSalesOrderPreassembleCandidateLabel,
  resolveSalesOrderLineDisplaySubtitle,
  resolveSalesOrderLineDisplayTitle,
} from './sales-order-line-display'

describe('sales-order-line-display', () => {
  it('prefers snapshot title and subtitle when present', () => {
    const line = {
      lineNo: 1,
      productModel: 'MODEL-A',
      specification: 'Spec A',
      description: 'Desc A',
      productDisplayTitleSnapshot: 'Fork Alpha',
      productDisplaySubtitleSnapshot: 'trail/disc/v2',
      productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
    }

    expect(resolveSalesOrderLineDisplayTitle(line)).toBe('Fork Alpha')
    expect(resolveSalesOrderLineDisplaySubtitle(line)).toBe('trail/disc/v2')
    expect(formatSalesOrderPreassembleCandidateLabel(line)).toBe('候选行 #1 Fork Alpha')
  })

  it('falls back to placeholders when snapshots are missing', () => {
    const line = {
      lineNo: 2,
      productModel: 'MODEL-B',
      specification: '',
      description: '',
      productDisplayTitleSnapshot: '',
      productDisplaySubtitleSnapshot: '',
      productDisplayFullLabelSnapshot: '',
    }

    expect(resolveSalesOrderLineDisplayTitle(line)).toBe('未识别产品')
    expect(resolveSalesOrderLineDisplaySubtitle(line)).toBe('--')
    expect(formatSalesOrderPreassembleCandidateLabel(line)).toBe('候选行 #2 未识别产品')
  })
})
