import { describe, expect, it, vi, beforeEach } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'

const { failLoudlyMock } = vi.hoisted(() => ({
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

import { buildParentChildrenProtocolBranchRelations } from './bom-workspace-parent-children-protocol-adapter'

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

describe('bom-workspace-parent-children-protocol-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps parent/children protocol draft into branch relation builder result', () => {
    const result = buildParentChildrenProtocolBranchRelations({
      protocolDraft: {
        rootChildren: ['branch:prepare'],
        branchNodes: [
          {
            id: 'branch:prepare',
            parentId: 'root',
            children: ['branch:prepare:collection'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料',
            sectionCode: 'PREPARE',
          },
          {
            id: 'branch:prepare:collection',
            parentId: 'branch:prepare',
            children: ['protocol:item:1'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '备料 明细',
            sectionCode: 'PREPARE',
          },
        ],
        itemNodes: [
          {
            id: 'protocol:item:1',
            parentId: 'branch:prepare:collection',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-1',
          },
        ],
      },
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
          sortOrder: 0,
        },
      ],
      resolveNumericField: (_index, _fieldName, value) => value as number,
      rootNodeId: 'root',
    })

    expect(result.rootChildNodeIds).toEqual(['branch:prepare'])
    expect(result.sectionBranchNodes).toHaveLength(1)
    expect(result.collectionBranchNodes).toHaveLength(1)
    expect(result.leafNodes).toEqual([
      expect.objectContaining({
        nodeId: 'protocol:item:1',
        parentNodeId: 'branch:prepare:collection',
        fieldId: 'field-1',
        index: 0,
        itemId: 'item-1',
        materialId: 'mat-1',
        materialName: '材料 A',
        unitPrice: 12,
        standardUsage: 3,
      }),
    ])
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('maps field-based protocol item nodes back to the current form row when business item id is missing', () => {
    const result = buildParentChildrenProtocolBranchRelations({
      protocolDraft: {
        rootChildren: ['branch:prepare'],
        branchNodes: [
          {
            id: 'branch:prepare',
            parentId: 'root',
            children: ['branch:prepare:collection'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料',
            sectionCode: 'PREPARE',
          },
          {
            id: 'branch:prepare:collection',
            parentId: 'branch:prepare',
            children: ['field:field-1'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '备料 明细',
            sectionCode: 'PREPARE',
          },
        ],
        itemNodes: [
          {
            id: 'field:field-1',
            parentId: 'branch:prepare:collection',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
          },
        ],
      },
      activeSections: sections,
      fields: [{ id: 'field-1' }],
      watchedItems: [
        {
          id: '',
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
          sortOrder: 0,
        },
      ],
      resolveNumericField: (_index, _fieldName, value) => value as number,
      rootNodeId: 'root',
    })

    expect(result.leafNodes).toEqual([
      expect.objectContaining({
        nodeId: 'field:field-1',
        parentNodeId: 'branch:prepare:collection',
        fieldId: 'field-1',
        index: 0,
        itemId: '',
        materialId: 'mat-1',
        materialName: '材料 A',
        unitPrice: 12,
        standardUsage: 3,
      }),
    ])
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('fails loudly when protocol item cannot be resolved to current form row', () => {
    expect(() =>
      buildParentChildrenProtocolBranchRelations({
        protocolDraft: {
          rootChildren: ['branch:prepare'],
          branchNodes: [
            {
              id: 'branch:prepare',
              parentId: 'root',
              children: ['branch:prepare:collection'],
              nodeKind: 'branch',
              branchRole: 'section',
              label: '备料',
              sectionCode: 'PREPARE',
            },
            {
              id: 'branch:prepare:collection',
              parentId: 'branch:prepare',
              children: ['protocol:item:missing'],
              nodeKind: 'branch',
              branchRole: 'collection',
              label: '备料 明细',
              sectionCode: 'PREPARE',
            },
          ],
          itemNodes: [
            {
              id: 'protocol:item:missing',
              parentId: 'branch:prepare:collection',
              children: [],
              nodeKind: 'item',
              sectionCode: 'PREPARE',
              itemId: 'missing-item',
            },
          ],
        },
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
            sortOrder: 0,
          },
        ],
        resolveNumericField: (_index, _fieldName, value) => value as number,
        rootNodeId: 'root',
      })
    ).toThrow('[CRITICAL] Unable to resolve protocol item node to current form row: protocol:item:missing')

    expect(failLoudlyMock).toHaveBeenCalledWith(
      expect.any(Error),
      'buildParentChildrenProtocolBranchRelations',
      { silentUI: true }
    )
  })
})
