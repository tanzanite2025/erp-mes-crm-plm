import { describe, expect, it } from 'vitest'
import {
  applySelectedMaterialToPackagingRuleDraft,
  buildPackagingRuleRelation,
  createEmptyPackagingRuleDraft,
  parsePackagingRuleFactor,
  toPackagingRuleDraft,
  toSavePackagingRuleInput,
  togglePackagingRuleDirection,
  updatePackagingRuleDraftField,
} from './packaging-rule-draft'

describe('packaging-rule-draft utilities', () => {
  it('creates the default draft contract', () => {
    expect(createEmptyPackagingRuleDraft()).toEqual({
      baseUnit: '',
      packUnit: '',
      conversionFactor: 1,
      direction: 'forward',
    })
  })

  it('builds forward and reverse relation strings', () => {
    expect(
      buildPackagingRuleRelation({
        packUnit: 'BOX',
        baseUnit: 'PCS',
        conversionFactor: 12,
        direction: 'forward',
      })
    ).toBe('1 BOX = 12 PCS')

    expect(
      buildPackagingRuleRelation({
        packUnit: 'BOX',
        baseUnit: 'PCS',
        conversionFactor: 12,
        direction: 'reverse',
      })
    ).toBe('1 PCS = 12 BOX')

    expect(buildPackagingRuleRelation(null)).toBe('1 ? = ? ?')
  })

  it('applies the selected material back to the draft and preserves prior fields', () => {
    const updated = applySelectedMaterialToPackagingRuleDraft(
      {
        packUnit: 'ROLL',
        conversionFactor: 3,
        direction: 'reverse',
      },
      {
        id: 'mat-1',
        uom: 'M',
      }
    )

    expect(updated).toEqual({
      materialId: 'mat-1',
      baseUnit: 'M',
      packUnit: 'ROLL',
      conversionFactor: 3,
      direction: 'reverse',
    })
  })

  it('updates a draft field while preserving the default direction contract', () => {
    expect(updatePackagingRuleDraftField(null, 'packUnit', 'BAG')).toEqual({
      baseUnit: '',
      packUnit: 'BAG',
      conversionFactor: 1,
      direction: 'forward',
    })
  })

  it('toggles conversion direction in both directions', () => {
    expect(togglePackagingRuleDirection(null).direction).toBe('reverse')
    expect(togglePackagingRuleDirection({ direction: 'reverse' }).direction).toBe('forward')
  })

  it('parses valid factor inputs and normalizes invalid ones to zero', () => {
    expect(parsePackagingRuleFactor('12.5')).toBe(12.5)
    expect(parsePackagingRuleFactor('oops')).toBe(0)
  })

  it('returns a save DTO only when all required fields are valid', () => {
    expect(
      toSavePackagingRuleInput({
        id: 'rule-1',
        materialId: 'mat-1',
        packUnit: 'BOX',
        baseUnit: 'PCS',
        conversionFactor: 24,
        direction: 'forward',
      })
    ).toEqual({
      id: 'rule-1',
      materialId: 'mat-1',
      packUnit: 'BOX',
      baseUnit: 'PCS',
      conversionFactor: 24,
      direction: 'forward',
    })

    expect(
      toSavePackagingRuleInput({
        materialId: 'mat-1',
        packUnit: 'BOX',
        baseUnit: 'PCS',
        conversionFactor: 0,
        direction: 'forward',
      })
    ).toBeNull()

    expect(toSavePackagingRuleInput(null)).toBeNull()
  })

  it('rehydrates a persisted rule into an editable draft with the resolved base unit', () => {
    expect(
      toPackagingRuleDraft(
        {
          id: 'rule-2',
          materialId: 'mat-2',
          packUnit: 'PALLET',
          baseUnit: 'LEGACY',
          conversionFactor: 50,
          direction: 'reverse',
          updatedAt: '2026-05-04T00:00:00.000Z',
        },
        'KG'
      )
    ).toEqual({
      id: 'rule-2',
      materialId: 'mat-2',
      packUnit: 'PALLET',
      baseUnit: 'KG',
      conversionFactor: 50,
      direction: 'reverse',
      updatedAt: '2026-05-04T00:00:00.000Z',
    })
  })
})
