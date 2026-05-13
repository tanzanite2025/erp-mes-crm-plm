import { describe, expect, it } from 'vitest'
import { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
import type { BOMSectionOption } from '../../data/bom-section-schema'

const mockSections: BOMSectionOption[] = [
  {
    value: 'MAIN',
    label: '主料',
    code: 'MAIN',
    name: '主料',
    active: true,
    sortOrder: 1,
    isDefault: true,
    legacyNames: [],
  },
]

const mockFields = [{ id: 'field-1' }, { id: 'field-2' }]

const mockItems = [
  {
    id: 'item-1',
    section: 'MAIN',
    materialId: 'mat-1',
    materialName: '材料1',
    unit: 'pcs',
    unitPrice: 100,
    unitUsage: 2,
    wastagePercent: 3,
    standardUsage: 2,
    sortOrder: 0,
  },
  {
    id: 'item-2',
    section: 'MAIN',
    materialId: 'mat-2',
    materialName: '材料2',
    unit: 'pcs',
    unitPrice: 50,
    unitUsage: 1,
    wastagePercent: 3,
    standardUsage: 1,
    sortOrder: 1,
  },
]

describe('synthetic-builder', () => {
  describe('buildSyntheticBOMWorkspaceBranchRelations', () => {
    it('should create section and collection branches for each section', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      expect(result.sectionBranchNodes).toHaveLength(1)
      expect(result.collectionBranchNodes).toHaveLength(1)
      expect(result.branchNodes).toHaveLength(2) // section + collection
    })

    it('should create section branch with correct properties', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      const sectionBranch = result.sectionBranchNodes[0]
      expect(sectionBranch.nodeKind).toBe('branch')
      expect(sectionBranch.branchRole).toBe('section')
      expect(sectionBranch.sectionCode).toBe('MAIN')
      expect(sectionBranch.sectionName).toBe('主料')
      expect(sectionBranch.parentNodeId).toBe('root')
      expect(sectionBranch.childNodeIds).toHaveLength(1)
    })

    it('should create collection branch with correct properties', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      const collectionBranch = result.collectionBranchNodes[0]
      expect(collectionBranch.nodeKind).toBe('branch')
      expect(collectionBranch.branchRole).toBe('collection')
      expect(collectionBranch.sectionCode).toBe('MAIN')
      expect(collectionBranch.label).toBe('主料 明细')
      expect(collectionBranch.childNodeIds.length).toBeGreaterThan(0)
    })

    it('should create leaf nodes for items', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      expect(result.leafNodes.length).toBeGreaterThan(0)
      
      const leafNode = result.leafNodes[0]
      expect(leafNode.nodeKind).toBe('leaf')
      expect(leafNode.materialId).toBeDefined()
      expect(leafNode.materialName).toBeDefined()
    })

    it('should filter items by section', () => {
      const multiSectionItems = [
        { id: 'item-1', section: 'MAIN', materialId: 'mat-1', materialName: '材料1', unit: 'pcs', unitPrice: 100, unitUsage: 2, wastagePercent: 3, standardUsage: 2, sortOrder: 0 },
        { id: 'item-2', section: 'AUX', materialId: 'mat-2', materialName: '材料2', unit: 'pcs', unitPrice: 50, unitUsage: 1, wastagePercent: 3, standardUsage: 1, sortOrder: 1 },
      ]

      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: multiSectionItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      // Should only include items from MAIN section
      const mainLeafNodes = result.leafNodes.filter(node => node.sectionCode === 'MAIN')
      expect(mainLeafNodes.length).toBeGreaterThan(0)
      
      const auxLeafNodes = result.leafNodes.filter(node => node.sectionCode === 'AUX')
      expect(auxLeafNodes.length).toBe(0)
    })

    it('should resolve numeric fields correctly', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, fieldName, _value) => {
          if (fieldName === 'unitPrice') return 999
          if (fieldName === 'standardUsage') return 888
          return 0
        },
        rootNodeId: 'root',
      })

      const leafNode = result.leafNodes[0]
      expect(leafNode.unitPrice).toBe(999)
      expect(leafNode.standardUsage).toBe(888)
    })

    it('should set root child node ids correctly', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      expect(result.rootChildNodeIds).toHaveLength(1)
      expect(result.rootChildNodeIds[0]).toBe(result.sectionBranchNodes[0].nodeId)
    })

    it('should handle empty items', () => {
      const result = buildSyntheticBOMWorkspaceBranchRelations({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: [],
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        rootNodeId: 'root',
      })

      expect(result.sectionBranchNodes).toHaveLength(1)
      expect(result.collectionBranchNodes).toHaveLength(1)
      expect(result.leafNodes).toHaveLength(0)
    })
  })
})
