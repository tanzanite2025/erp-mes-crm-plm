import { z } from 'zod'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-source-model'

const branchRoleSchema = z.enum(['section', 'collection'])

const protocolBranchDraftSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  nodeKind: z.literal('branch'),
  branchRole: branchRoleSchema.optional(),
  label: z.string(),
  sectionCode: z.string(),
  sectionName: z.string().optional(),
})

const protocolItemDraftSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  nodeKind: z.literal('item'),
  sectionCode: z.string(),
  sectionName: z.string().optional(),
  itemId: z.string().optional(),
})

const protocolDraftCandidateSchema = z.object({
  rootChildren: z.array(z.string()),
  branchNodes: z.array(protocolBranchDraftSchema),
  itemNodes: z.array(protocolItemDraftSchema),
})

const relationSidecarCandidateSchema = z.object({
  kind: z.literal('parent_children_protocol'),
  version: z.literal('v1'),
  protocolDraft: protocolDraftCandidateSchema,
})

const detailSourceCandidateSchema = z.object({
  relationSidecar: relationSidecarCandidateSchema,
})

export function resolveBOMWorkspaceAuthoritativeProtocolDraftFromRawDetailSource(
  rawSource: Record<string, unknown>
): BOMWorkspaceParentChildrenProtocolDraft | undefined {
  const result = detailSourceCandidateSchema.safeParse(rawSource)
  if (!result.success) {
    return undefined
  }

  return result.data.relationSidecar.protocolDraft
}
