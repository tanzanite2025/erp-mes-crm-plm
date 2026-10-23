import { describe, expect, it } from 'vitest'
import { createEmptyBOMFormValue } from './bom-form-defaults'
import {
  buildBOMProductPerformanceVersionWeightComparison,
  formatBOMProductPerformanceVersionWeight,
} from './bom-product-performance-version-weight-comparison'

describe('product performance version weights respect model and BOM lifecycle', () => {
  const currentBOM = createEmptyBOMFormValue({
    id: 'current-bom',
    productId: 'model-a',
    versionLevel: 'lightweight',
    measuredWeight: 520,
    measuredWeightUnit: 'g',
  })
  const standardBOM = createEmptyBOMFormValue({
    id: 'standard-bom',
    productId: 'model-a',
    versionLevel: 'std',
    measuredWeight: 480,
    measuredWeightUnit: 'g',
    status: 'RELEASED',
  })

  it('shows the actual versions of this model, without creating the unused shared choices', () => {
    const comparison = buildBOMProductPerformanceVersionWeightComparison(
      currentBOM,
      [standardBOM]
    )
    expect([...comparison.keys()]).toEqual(['std', 'lightweight'])
    expect(comparison.has('reinforced')).toBe(false)
    expect(comparison.get('lightweight')).toMatchObject({
      isCurrentBOM: true,
      bom: { measuredWeight: 520 },
    })
    expect(comparison.get('std')).toMatchObject({
      isCurrentBOM: false,
      bom: { measuredWeight: 480 },
    })
  })

  it('keeps different models, owners, production BOMs and obsolete revisions out of the comparison', () => {
    const unrelatedBOMs = [
      {
        ...standardBOM,
        id: 'other-model',
        productId: 'model-b',
        versionLevel: 'other-model',
      },
      {
        ...standardBOM,
        id: 'customer-bom',
        ownerType: 'CUSTOMER' as const,
        ownerCustomerId: 'customer-a',
        versionLevel: 'customer',
      },
      {
        ...standardBOM,
        id: 'production-bom',
        bomType: 'MBOM' as const,
        versionLevel: 'production',
      },
      {
        ...standardBOM,
        id: 'obsolete-bom',
        status: 'OBSOLETE' as const,
        versionLevel: 'obsolete',
      },
    ]
    expect([
      ...buildBOMProductPerformanceVersionWeightComparison(currentBOM, [
        standardBOM,
        ...unrelatedBOMs,
      ]).keys(),
    ]).toEqual(['std', 'lightweight'])
    const customerBOM = {
      ...currentBOM,
      ownerType: 'CUSTOMER' as const,
      ownerCustomerId: 'customer-a',
    }
    expect(
      buildBOMProductPerformanceVersionWeightComparison(customerBOM, [
        standardBOM,
        ...unrelatedBOMs,
      ]).has('std')
    ).toBe(false)
    expect(
      buildBOMProductPerformanceVersionWeightComparison(
        customerBOM,
        unrelatedBOMs
      ).has('customer')
    ).toBe(true)
  })

  it('uses the latest released revision for other versions while showing the current unsaved BOM only once', () => {
    const records = [
      {
        ...standardBOM,
        id: 'old-release',
        createdAt: '2026-01-01',
        measuredWeight: 470,
      },
      {
        ...standardBOM,
        id: 'new-release',
        createdAt: '2026-02-01',
        measuredWeight: 480,
      },
      {
        ...standardBOM,
        id: 'new-draft',
        status: 'DRAFT' as const,
        createdAt: '2026-10-01',
        measuredWeight: 490,
      },
      {
        ...currentBOM,
        versionLevel: 'old-current-version',
        measuredWeight: 900,
      },
    ]
    const comparison = buildBOMProductPerformanceVersionWeightComparison(
      currentBOM,
      records
    )
    expect(comparison.get('std')?.bom.measuredWeight).toBe(480)
    expect(comparison.has('old-current-version')).toBe(false)
    expect(comparison.get('lightweight')?.bom.measuredWeight).toBe(520)
  })

  it('does not represent missing weights or unselected models as zero-weight versions', () => {
    expect(
      formatBOMProductPerformanceVersionWeight(
        { measuredWeight: 0, measuredWeightUnit: 'g' },
        'zh-CN'
      )
    ).toBe('未填重量')
    expect(
      formatBOMProductPerformanceVersionWeight(
        { measuredWeight: 0.42, measuredWeightUnit: 'kg' },
        'zh-CN'
      )
    ).toBe('0.42 kg')
    expect(
      formatBOMProductPerformanceVersionWeight(
        { measuredWeight: 420, measuredWeightUnit: '' },
        'zh-CN'
      )
    ).toBe('420 · 未填单位')
    expect(
      buildBOMProductPerformanceVersionWeightComparison(
        { ...currentBOM, productId: '' },
        [standardBOM]
      ).size
    ).toBe(0)
  })
})
