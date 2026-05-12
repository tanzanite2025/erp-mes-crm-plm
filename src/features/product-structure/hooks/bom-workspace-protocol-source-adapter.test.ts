import { describe, expect, it } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource } from './bom-workspace-protocol-source-adapter'

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
  {
    value: 'ROLLING',
    label: '卷料',
    code: 'ROLLING',
    name: '卷料',
    active: true,
    sortOrder: 2,
    isDefault: false,
    legacyNames: ['卷料'],
  },
]

describe('bom-workspace-protocol-source-adapter', () => {
  it('builds a protocol draft from BOM detail source using live form rows', () => {
    const protocolDraft = buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
      sourceBOM: {
        id: 'bom-1',
        bomNo: 'BOM-001',
        productId: 'product-1',
        bomVersion: 'V1.0',
        status: 'active',
        items: [
          {
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
          },
        ],
        description: '',
        version: 1,
        revisionNo: 'R1',
        changeType: 'MANUAL',
        isDefaultSite: true,
        siteCode: '',
        effectiveFrom: null,
        effectiveTo: null,
      } as never,
      activeSections: sections,
      fields: [{ id: 'field-1' }],
      watchedItems: [
        {
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
        },
      ] as never,
    })

    expect(protocolDraft).toEqual({
      rootChildren: ['section:PREPARE', 'section:ROLLING'],
      branchNodes: expect.arrayContaining([
        expect.objectContaining({
          id: 'section:PREPARE',
          parentId: 'root',
          children: ['section:PREPARE:collection'],
          nodeKind: 'branch',
          branchRole: 'section',
        }),
        expect.objectContaining({
          id: 'section:PREPARE:collection',
          parentId: 'section:PREPARE',
          children: ['item:item-1'],
          nodeKind: 'branch',
          branchRole: 'collection',
        }),
        expect.objectContaining({
          id: 'section:ROLLING',
          parentId: 'root',
          children: ['section:ROLLING:collection'],
        }),
      ]),
      itemNodes: [
        {
          id: 'item:item-1',
          parentId: 'section:PREPARE:collection',
          children: [],
          nodeKind: 'item',
          sectionCode: 'PREPARE',
          itemId: 'item-1',
        },
      ],
    })
  })

  it('returns undefined while detail source and live form rows are not aligned yet', () => {
    const protocolDraft = buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
      sourceBOM: {
        id: 'bom-1',
        bomNo: 'BOM-001',
        productId: 'product-1',
        bomVersion: 'V1.0',
        status: 'active',
        items: [
          {
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
          },
        ],
        description: '',
        version: 1,
        revisionNo: 'R1',
        changeType: 'MANUAL',
        isDefaultSite: true,
        siteCode: '',
        effectiveFrom: null,
        effectiveTo: null,
      } as never,
      activeSections: sections,
      fields: [],
      watchedItems: [] as never,
    })

    expect(protocolDraft).toBeUndefined()
  })
})
