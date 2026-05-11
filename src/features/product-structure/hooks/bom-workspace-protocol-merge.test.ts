import { describe, expect, it } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { mergeBOMWorkspaceParentChildrenProtocolDrafts } from './bom-workspace-protocol-merge'

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

describe('bom-workspace-protocol-merge', () => {
  it('preserves authoritative branch topology while appending unmatched live items', () => {
    const merged = mergeBOMWorkspaceParentChildrenProtocolDrafts({
      activeSections: [sections[0]],
      liveProtocolDraft: {
        rootChildren: ['section:PREPARE'],
        branchNodes: [
          {
            id: 'section:PREPARE',
            parentId: 'root',
            children: ['section:PREPARE:collection'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
          {
            id: 'section:PREPARE:collection',
            parentId: 'section:PREPARE',
            children: ['item:item-1', 'item:item-2'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '备料 明细',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
        ],
        itemNodes: [
          {
            id: 'item:item-1',
            parentId: 'section:PREPARE:collection',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-1',
          },
          {
            id: 'item:item-2',
            parentId: 'section:PREPARE:collection',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-2',
          },
        ],
      },
      authoritativeProtocolDraft: {
        rootChildren: ['branch:prepare'],
        branchNodes: [
          {
            id: 'branch:prepare',
            parentId: 'root',
            children: ['branch:prepare:main'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料拓扑',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
          {
            id: 'branch:prepare:main',
            parentId: 'branch:prepare',
            children: ['auth:item-1', 'auth:ghost'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '主支路',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
        ],
        itemNodes: [
          {
            id: 'auth:item-1',
            parentId: 'branch:prepare:main',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-1',
          },
          {
            id: 'auth:ghost',
            parentId: 'branch:prepare:main',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-ghost',
          },
        ],
      },
    })

    expect(merged).toEqual({
      rootChildren: ['branch:prepare'],
      branchNodes: [
        {
          id: 'branch:prepare',
          parentId: 'root',
          children: ['branch:prepare:main'],
          nodeKind: 'branch',
          branchRole: 'section',
          label: '备料拓扑',
          sectionCode: 'PREPARE',
          sectionName: '备料',
        },
        {
          id: 'branch:prepare:main',
          parentId: 'branch:prepare',
          children: ['auth:item-1', 'item:item-2'],
          nodeKind: 'branch',
          branchRole: 'collection',
          label: '主支路',
          sectionCode: 'PREPARE',
          sectionName: '备料',
        },
      ],
      itemNodes: [
        {
          id: 'auth:item-1',
          parentId: 'branch:prepare:main',
          children: [],
          nodeKind: 'item',
          sectionCode: 'PREPARE',
          sectionName: '备料',
          itemId: 'item-1',
        },
        {
          id: 'item:item-2',
          parentId: 'branch:prepare:main',
          children: [],
          nodeKind: 'item',
          sectionCode: 'PREPARE',
          sectionName: '备料',
          itemId: 'item-2',
        },
      ],
    })
  })

  it('moves retained authoritative items onto fallback section branches when live rows change section', () => {
    const merged = mergeBOMWorkspaceParentChildrenProtocolDrafts({
      activeSections: sections,
      liveProtocolDraft: {
        rootChildren: ['section:PREPARE', 'section:ROLLING'],
        branchNodes: [
          {
            id: 'section:PREPARE',
            parentId: 'root',
            children: ['section:PREPARE:collection'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
          {
            id: 'section:PREPARE:collection',
            parentId: 'section:PREPARE',
            children: [],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '备料 明细',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
          {
            id: 'section:ROLLING',
            parentId: 'root',
            children: ['section:ROLLING:collection'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '卷料',
            sectionCode: 'ROLLING',
            sectionName: '卷料',
          },
          {
            id: 'section:ROLLING:collection',
            parentId: 'section:ROLLING',
            children: ['item:item-1'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '卷料 明细',
            sectionCode: 'ROLLING',
            sectionName: '卷料',
          },
        ],
        itemNodes: [
          {
            id: 'item:item-1',
            parentId: 'section:ROLLING:collection',
            children: [],
            nodeKind: 'item',
            sectionCode: 'ROLLING',
            itemId: 'item-1',
          },
        ],
      },
      authoritativeProtocolDraft: {
        rootChildren: ['branch:prepare'],
        branchNodes: [
          {
            id: 'branch:prepare',
            parentId: 'root',
            children: ['branch:prepare:main'],
            nodeKind: 'branch',
            branchRole: 'section',
            label: '备料拓扑',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
          {
            id: 'branch:prepare:main',
            parentId: 'branch:prepare',
            children: ['auth:item-1'],
            nodeKind: 'branch',
            branchRole: 'collection',
            label: '主支路',
            sectionCode: 'PREPARE',
            sectionName: '备料',
          },
        ],
        itemNodes: [
          {
            id: 'auth:item-1',
            parentId: 'branch:prepare:main',
            children: [],
            nodeKind: 'item',
            sectionCode: 'PREPARE',
            itemId: 'item-1',
          },
        ],
      },
    })

    expect(merged).toEqual({
      rootChildren: ['branch:prepare', 'section:ROLLING'],
      branchNodes: expect.arrayContaining([
        {
          id: 'branch:prepare',
          parentId: 'root',
          children: ['branch:prepare:main'],
          nodeKind: 'branch',
          branchRole: 'section',
          label: '备料拓扑',
          sectionCode: 'PREPARE',
          sectionName: '备料',
        },
        {
          id: 'branch:prepare:main',
          parentId: 'branch:prepare',
          children: [],
          nodeKind: 'branch',
          branchRole: 'collection',
          label: '主支路',
          sectionCode: 'PREPARE',
          sectionName: '备料',
        },
        {
          id: 'section:ROLLING',
          parentId: 'root',
          children: ['section:ROLLING:collection'],
          nodeKind: 'branch',
          branchRole: 'section',
          label: '卷料',
          sectionCode: 'ROLLING',
          sectionName: '卷料',
        },
        {
          id: 'section:ROLLING:collection',
          parentId: 'section:ROLLING',
          children: ['auth:item-1'],
          nodeKind: 'branch',
          branchRole: 'collection',
          label: '卷料 明细',
          sectionCode: 'ROLLING',
          sectionName: '卷料',
        },
      ]),
      itemNodes: [
        {
          id: 'auth:item-1',
          parentId: 'section:ROLLING:collection',
          children: [],
          nodeKind: 'item',
          sectionCode: 'ROLLING',
          sectionName: '卷料',
          itemId: 'item-1',
        },
      ],
    })
  })
})
