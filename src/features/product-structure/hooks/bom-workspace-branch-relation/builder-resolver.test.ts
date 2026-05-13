import { describe, expect, it, vi } from 'vitest'
import { resolveBOMWorkspaceBranchRelationBuilder } from './builder-resolver'
import { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'

describe('builder-resolver', () => {
  describe('resolveBOMWorkspaceBranchRelationBuilder', () => {
    it('should return custom builder if provided', () => {
      const customBuilder = vi.fn()

      const result = resolveBOMWorkspaceBranchRelationBuilder({
        branchRelationBuilder: customBuilder,
      })

      expect(result).toBe(customBuilder)
    })

    it('should return protocol builder if protocol draft provided', () => {
      const protocolDraft = {
        rootChildren: [],
        branchNodes: [],
        itemNodes: [],
      }

      const result = resolveBOMWorkspaceBranchRelationBuilder({
        protocolDraft,
      })

      expect(result).toBeTypeOf('function')
      expect(result).not.toBe(buildSyntheticBOMWorkspaceBranchRelations)
    })

    it('should return synthetic builder by default', () => {
      const result = resolveBOMWorkspaceBranchRelationBuilder({})

      expect(result).toBe(buildSyntheticBOMWorkspaceBranchRelations)
    })

    it('should prioritize custom builder over protocol draft', () => {
      const customBuilder = vi.fn()
      const protocolDraft = {
        rootChildren: [],
        branchNodes: [],
        itemNodes: [],
      }

      const result = resolveBOMWorkspaceBranchRelationBuilder({
        branchRelationBuilder: customBuilder,
        protocolDraft,
      })

      expect(result).toBe(customBuilder)
    })
  })
})
