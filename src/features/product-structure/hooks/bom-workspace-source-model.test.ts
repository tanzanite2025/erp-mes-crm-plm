import { describe, expect, it, vi } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { buildBOMWorkspaceSourceModel, type BOMWorkspaceBranchRelationBuilder } from './bom-workspace-source-model'

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

describe('bom-workspace-source-model', () => {
  it('uses protocol draft through the source-model builder injection chain when provided', () => {
    const sourceModel = buildBOMWorkspaceSourceModel({
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
      ],
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
      resolveNumericField: (_index, _fieldName, value) => value as number,
    })

    expect(sourceModel.rootNode.childNodeIds).toEqual(['branch:prepare'])
    expect(sourceModel.sectionBranchNodes.map((node) => node.nodeId)).toEqual(['branch:prepare'])
    expect(sourceModel.collectionBranchNodes.map((node) => node.nodeId)).toEqual(['branch:prepare:collection'])
    expect(sourceModel.leafNodes).toEqual([
      expect.objectContaining({
        nodeId: 'protocol:item:1',
        parentNodeId: 'branch:prepare:collection',
        fieldId: 'field-1',
        index: 0,
      }),
    ])
  })

  it('prefers an explicit branchRelationBuilder override over protocol draft', () => {
    const branchRelationBuilder: BOMWorkspaceBranchRelationBuilder = vi.fn(() => ({
      rootChildNodeIds: [],
      branchNodes: [],
      sectionBranchNodes: [],
      collectionBranchNodes: [],
      leafNodes: [],
    }))

    const sourceModel = buildBOMWorkspaceSourceModel({
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
      ],
      branchRelationBuilder,
      protocolDraft: {
        rootChildren: ['branch:prepare'],
        branchNodes: [
          {
            id: 'branch:prepare',
            parentId: 'root',
            children: [],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料',
            sectionCode: 'PREPARE',
          },
        ],
        itemNodes: [],
      },
      resolveNumericField: (_index, _fieldName, value) => value as number,
    })

    expect(branchRelationBuilder).toHaveBeenCalledOnce()
    expect(sourceModel.rootNode.childNodeIds).toEqual([])
    expect(sourceModel.branchNodes).toEqual([])
    expect(sourceModel.leafNodes).toEqual([])
  })
})
