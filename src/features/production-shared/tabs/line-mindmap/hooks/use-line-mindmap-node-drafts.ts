import { useState } from 'react'
import type { LineMindmapNode } from '../data/sample-mindmap'

export type LineMindmapNodeDraft = Pick<LineMindmapNode, 'actionType' | 'dialogKey' | 'note'>
export type LineMindmapNodeDraftMap = Record<string, LineMindmapNodeDraft>

export function useLineMindmapNodeDrafts() {
  const [nodeDraftMap, setNodeDraftMap] = useState<LineMindmapNodeDraftMap>({})

  const patchNodeDraft = (
    nodeId: string,
    patch: Partial<LineMindmapNodeDraft>,
  ) => {
    setNodeDraftMap((current) => ({
      ...current,
      [nodeId]: {
        actionType: patch.actionType ?? current[nodeId]?.actionType ?? 'none',
        dialogKey: patch.dialogKey ?? current[nodeId]?.dialogKey ?? '',
        note: patch.note ?? current[nodeId]?.note ?? '',
      },
    }))
  }

  return {
    nodeDraftMap,
    patchNodeDraft,
  }
}
