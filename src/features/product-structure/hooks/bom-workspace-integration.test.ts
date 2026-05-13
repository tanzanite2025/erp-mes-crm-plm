import { describe, expect, it } from 'vitest'
import { buildBOMWorkspaceSourceModel } from './bom-workspace-source'
import { getActiveBOMSections } from '../utils/bom-section-utils'
import type { BOMSectionOption } from '../data/bom-section-schema'

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
  {
    value: 'AUX',
    label: '辅料',
    code: 'AUX',
    name: '辅料',
    active: true,
    sortOrder: 2,
    isDefault: false,
    legacyNames: [],
  },
]

const mockFields = [
  { id: 'field-1' },
  { id: 'field-2' },
  { id: 'field-3' },
]

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
  {
    id: 'item-3',
    section: 'AUX',
    materialId: 'mat-3',
    materialName: '材料3',
    unit: 'pcs',
    unitPrice: 30,
    unitUsage: 3,
    wastagePercent: 3,
    standardUsage: 3,
    sortOrder: 2,
  },
]

describe('BOM Workspace Integration', () => {
  describe('End-to-end with synthetic mode', () => {
    it('should build complete workspace model', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Verify root node
      expect(model.rootNode).toBeDefined()
      expect(model.rootNode.nodeKind).toBe('root')
      expect(model.rootNode.nodeId).toBe('root')
      expect(model.rootNode.parentNodeId).toBeNull()

      // Verify structure
      expect(model.rootNode.childNodeIds).toHaveLength(activeSections.length)
      expect(model.sectionBranchNodes).toHaveLength(activeSections.length)
      expect(model.collectionBranchNodes).toHaveLength(activeSections.length)
      expect(model.leafNodes.length).toBeGreaterThan(0)
    })

    it('should maintain correct parent-child relationships', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Verify all nodes are in the map
      model.sourceNodes.forEach((node) => {
        expect(model.nodeById.get(node.nodeId)).toBe(node)
      })

      // Verify parent-child relationships
      model.branchNodes.forEach((branch) => {
        // Check parent relationship
        if (branch.parentNodeId) {
          const parent = model.nodeById.get(branch.parentNodeId)
          expect(parent).toBeDefined()
          expect(parent!.childNodeIds).toContain(branch.nodeId)
        }

        // Check children relationships
        branch.childNodeIds.forEach((childId) => {
          const child = model.nodeById.get(childId)
          expect(child).toBeDefined()
          expect(child!.parentNodeId).toBe(branch.nodeId)
        })
      })

      // Verify leaf nodes
      model.leafNodes.forEach((leaf) => {
        expect(leaf.parentNodeId).not.toBeNull()
        const parent = model.nodeById.get(leaf.parentNodeId!)
        expect(parent).toBeDefined()
        expect(parent!.childNodeIds).toContain(leaf.nodeId)
      })
    })

    it('should correctly categorize nodes by section', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Each section should have exactly one section branch
      const sectionCodes = new Set(model.sectionBranchNodes.map(n => n.sectionCode))
      expect(sectionCodes.size).toBe(activeSections.length)

      // Verify leaf nodes are correctly assigned to sections
      const mainLeaves = model.leafNodes.filter(n => n.sectionCode === 'MAIN')
      const auxLeaves = model.leafNodes.filter(n => n.sectionCode === 'AUX')
      
      expect(mainLeaves.length).toBeGreaterThan(0)
      expect(auxLeaves.length).toBeGreaterThan(0)
    })

    it('should preserve item data in leaf nodes', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Verify each item is represented in leaf nodes
      mockItems.forEach((item) => {
        const matchingLeaves = model.leafNodes.filter(
          leaf => leaf.materialId === item.materialId
        )
        expect(matchingLeaves.length).toBeGreaterThan(0)

        matchingLeaves.forEach((leaf) => {
          expect(leaf.materialName).toBe(item.materialName)
          expect(leaf.sectionCode).toBe(item.section)
          expect(leaf.unitPrice).toBe(item.unitPrice)
          expect(leaf.standardUsage).toBe(item.standardUsage)
        })
      })
    })

    it('should handle empty items gracefully', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: [],
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      expect(model.rootNode).toBeDefined()
      expect(model.sectionBranchNodes).toHaveLength(activeSections.length)
      expect(model.collectionBranchNodes).toHaveLength(activeSections.length)
      expect(model.leafNodes).toHaveLength(0)
    })

    it('should handle single section', () => {
      const singleSection = [mockSections[0]]
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections: singleSection,
        fields: mockFields,
        watchedItems: mockItems.filter(item => item.section === 'MAIN'),
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      expect(model.sectionBranchNodes).toHaveLength(1)
      expect(model.sectionBranchNodes[0].sectionCode).toBe('MAIN')
      expect(model.leafNodes.every(leaf => leaf.sectionCode === 'MAIN')).toBe(true)
    })
  })

  describe('Performance characteristics', () => {
    it('should handle large number of items efficiently', () => {
      const largeItemSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        section: i % 2 === 0 ? 'MAIN' : 'AUX',
        materialId: `mat-${i}`,
        materialName: `材料${i}`,
        unit: 'pcs',
        unitPrice: 100 + i,
        unitUsage: 1,
        wastagePercent: 3,
        standardUsage: 1 + (i % 10),
        sortOrder: i,
      }))

      const largeFieldSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `field-${i}`,
      }))

      const startTime = performance.now()
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections: getActiveBOMSections(mockSections),
        fields: largeFieldSet,
        watchedItems: largeItemSet,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (< 100ms for 1000 items)
      expect(duration).toBeLessThan(100)

      // Verify structure is correct
      expect(model.leafNodes.length).toBeGreaterThan(0)
      expect(model.nodeById.size).toBe(model.sourceNodes.length)
    })

    it('should maintain O(1) node lookup', () => {
      const activeSections = getActiveBOMSections(mockSections)
      
      const model = buildBOMWorkspaceSourceModel({
        activeSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Multiple lookups should be fast
      const startTime = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        const node = model.nodeById.get('root')
        expect(node).toBeDefined()
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 10000 lookups should be very fast (< 500ms)
      expect(duration).toBeLessThan(500)
    })
  })
})
