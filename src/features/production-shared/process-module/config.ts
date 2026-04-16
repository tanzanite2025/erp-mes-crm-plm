import { AlertTriangle, Clock3, ShieldCheck } from 'lucide-react'
import type { ProcessModuleContext } from './adapter'
import type { ProcessModuleStatus } from './types'
import { sharedProcessNodeStatusMap } from './status-mapping'

export type ProcessFieldTone = 'muted' | 'accent' | 'danger'
export type ProcessFieldWidth = 'sm' | 'md' | 'lg'

export type ProcessFieldConfig = {
  key: string
  label: string
  value: string
  tone?: ProcessFieldTone
  width?: ProcessFieldWidth
}

export type ProcessBadgeConfig = {
  label: string
  tone: string
}

export type ProcessTreeNodeStatus = 'normal' | 'disabled' | 'warning' | 'danger' | 'blocked'

export type ProcessTreeNodeConfig = {
  key: string
  label: string
  meta?: string
  status?: ProcessTreeNodeStatus
  children?: ProcessTreeNodeConfig[]
}

export type ProcessCardSectionConfig = {
  title: string
  fields?: ProcessFieldConfig[]
  tree?: ProcessTreeNodeConfig[]
}

export type ProcessCardConfig = {
  id: string
  code: string
  name: string
  status: ProcessModuleStatus
  badges: ProcessBadgeConfig[]
  sections: ProcessCardSectionConfig[]
}

export type ProcessModuleConfig = {
  title: string
  subtitle: string
  cards: ProcessCardConfig[]
}

export const statusMeta: Record<ProcessModuleStatus, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: '运行中', className: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20', icon: ShieldCheck },
  idle: { label: '待机', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: Clock3 },
  blocked: { label: '受阻', className: 'bg-rose-500/10 text-rose-700 border-rose-500/20', icon: AlertTriangle },
}

export const treeNodeStatusMeta = sharedProcessNodeStatusMap
