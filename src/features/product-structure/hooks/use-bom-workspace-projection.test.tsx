// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { createEmptyBOMFormValue } from '../utils/bom-form-defaults'
import { useBOMWorkspaceProjection } from './use-bom-workspace-projection'

const sections: BOMSectionOption[] = [
  {
    value: 'PREPARE',
    label: '备料',
    code: 'PREPARE',
    name: '备料',
    active: true,
    sortOrder: 1,
    isDefault: true,
    legacyNames: ['备料'],
  },
]

function renderProjection(items: BOM['items'], fields: Array<{ id: string }>, expandedBranchKeys: string[]) {
  return renderHook(() => {
    const form = useForm<BOM>({
      defaultValues: createEmptyBOMFormValue({
        productId: 'product-1',
        items,
      }, sections),
    })

    return useBOMWorkspaceProjection({
      form,
      fields,
      sections,
      activeGroupKey: 'PREPARE',
      expandedBranchKeys,
    })
  })
}

describe('useBOMWorkspaceProjection', () => {
  it('flattens the default section-owned collection branch from visible tree nodes', () => {
    const { result } = renderProjection(
      [{
        id: 'item-1',
        section: 'PREPARE',
        materialId: 'mat-1',
        materialName: '材料 A',
        materialSpec: '',
        unitPrice: 12,
        unit: 'pcs',
        unitUsage: 1,
        wastagePercent: 0,
        standardUsage: 3,
        materialType: '',
        supplyChannel: '',
      }],
      [{ id: 'field-1' }],
      ['section:PREPARE']
    )

    expect(
      result.current.visibleTreeNodes
        .filter((node) => node.nodeType === 'branch')
        .map((node) => node.label)
    ).toEqual(['备料'])
    expect(result.current.visibleTreeNodes.some((node) => node.nodeType === 'branch' && node.label === '备料 明细')).toBe(false)
    expect(result.current.visibleTreeNodes.filter((node) => node.nodeType === 'leaf')).toHaveLength(1)
    expect(result.current.visibleTreeNodes.some((node) => node.nodeType === 'synthetic' && node.syntheticKind === 'append-row')).toBe(true)
  })

  it('surfaces the empty initializer directly under section when the collection layer is flattened', () => {
    const { result } = renderProjection([], [], ['section:PREPARE'])

    expect(
      result.current.visibleTreeNodes
        .filter((node) => node.nodeType === 'branch')
        .map((node) => node.label)
    ).toEqual(['备料'])
    expect(result.current.visibleTreeNodes.some((node) => node.nodeType === 'branch' && node.label === '备料 明细')).toBe(false)
    expect(result.current.visibleTreeNodes.filter((node) => node.nodeType === 'synthetic' && node.syntheticKind === 'group-empty')).toHaveLength(1)
  })
})
