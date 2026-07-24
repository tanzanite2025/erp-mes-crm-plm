import type { LineMindmapLineOption } from './adapters/line-mindmap-adapter'

export interface MindmapParentNodeOption {
  id: string
  label: string
  sourceId?: string
}

export interface LineMindmapProcessDraft {
  description: string
  isActive: boolean
  name: string
}

export interface LineMindmapProcessOption {
  id: string
  label: string
  code?: string
}

export interface LineMindmapToolbarProps {
  activeLine: boolean
  activeLineIsActive: boolean
  canManageLine: boolean
  canUpdateLine: boolean
  isCheckingPermissions: boolean
  lineOptions: LineMindmapLineOption[]
  resolvedLineId: string
  selectedNode: boolean
  title: string
  onCreateLevel1: () => void
  onCreateLevel2: () => void
  onCreateLevel3: () => void
  onDeleteLine: () => void
  onEditLine: () => void
  onToggleLine: () => void
  onEditNode: () => void
  onSelectLine: (value: string) => void
}
