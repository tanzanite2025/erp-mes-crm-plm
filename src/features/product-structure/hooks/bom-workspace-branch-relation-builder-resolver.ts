import {
  buildParentChildrenProtocolBranchRelations,
  buildSyntheticBOMWorkspaceBranchRelations,
  type BOMWorkspaceBranchRelationBuilder,
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-branch-relation-builder'

export interface ResolveBOMWorkspaceBranchRelationBuilderParams {
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function resolveBOMWorkspaceBranchRelationBuilder({
  branchRelationBuilder,
  protocolDraft,
}: ResolveBOMWorkspaceBranchRelationBuilderParams): BOMWorkspaceBranchRelationBuilder {
  if (branchRelationBuilder) {
    return branchRelationBuilder
  }

  if (protocolDraft) {
    return buildParentChildrenProtocolBranchRelations(protocolDraft)
  }

  return buildSyntheticBOMWorkspaceBranchRelations
}
