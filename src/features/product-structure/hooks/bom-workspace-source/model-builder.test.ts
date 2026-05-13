import { describe, expect, it, vi } from 'vitest'
import { buildBOMWorkspaceSourceModel, resolveBOMWorkspaceSourceRootNodeId } from './model-builder'
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
    section: 'AUX',
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

describe('model-builder', () => {
  describe('resolveBOMWorkspaceSourceRootNodeId', () => {
    it('should return fixed root node id', () => {
      expect(resolveBOMWorkspaceSourceRootNodeId()).toBe('root')
    })
  })

  describe('buildBOMWorkspaceSourceModel', () => {
    it('should build model with synthetic builder by default', () => {
      const model = buildBOMWorkspaceSourceModel({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      expect(model.rootNode).toBeDefined()
      expect(model.rootNode.nodeKind).toBe('root')
      expect(model.rootNode.nodeId).toBe('root')
      expect(model.sourceNodes.length).toBeGreaterThan(0)
      expect(model.nodeById.size).toBeGreaterThan(0)
    })

    it('should create correct node structure', () => {
      const model = buildBOMWorkspaceSourceModel({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Should have root node
      expect(model.rootNode.nodeKind).toBe('root')
      expect(model.rootNode.parentNodeId).toBeNull()

      // Should have branch nodes for each section
      expect(model.sectionBranchNodes.length).toBe(2)
      expect(model.collectionBranchNodes.length).toBe(2)

      // Should have leaf nodes for items
      expect(model.leafNodes.length).toBeGreaterThan(0)
    })

    it('should build nodeById map correctly', () => {
      const model = buildBOMWorkspaceSourceModel({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
      })

      // Root node should be in map
      expect(model.nodeById.get('root')).toBe(model.rootNode)

      // All branch nodes should be in map
      model.branchNodes.forEach((node) => {
        expect(model.nodeById.get(node.nodeId)).toBe(node)
      })

      // All leaf nodes should be in map
      model.leafNodes.forEach((node) => {
        expect(model.nodeById.get(node.nodeId)).toBe(node)
      })
    })

    it('should use custom branch relation builder if provided', () => {
      const customBuilder = vi.fn(() => ({
        rootChildNodeIds: ['custom-child'],
        branchNodes: [],
        sectionBranchNodes: [],
        collectionBranchNodes: [],
        leafNodes: [],
      }))

      buildBOMWorkspaceSourceModel({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField: (_index, _fieldName, value) => Number(value) || 0,
        branchRelationBuilder: customBuilder,
      })

      expect(customBuilder).toHaveBeenCalled()
    })

    it('should resolve numeric fields correctly', () => {
      const resolveNumericField = vi.fn((_index, _fieldName, value) => Number(value) || 0)

      buildBOMWorkspaceSourceModel({
        activeSections: mockSections,
        fields: mockFields,
        watchedItems: mockItems,
        resolveNumericField,
      })

      expect(resolveNumericField).toHaveBeenCalled()
    })
  })
})
