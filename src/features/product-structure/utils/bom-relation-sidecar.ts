import { type BOMWorkspaceParentChildrenProtocolDraft } from '../hooks/bom-workspace-branch-relation'

export interface BOMRelationSidecar {
  kind: 'parent_children_protocol'
  version: 'v1'
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft
}

export function buildBOMRelationSidecar(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft
): BOMRelationSidecar {
  return {
    kind: 'parent_children_protocol',
    version: 'v1',
    protocolDraft,
  }
}
