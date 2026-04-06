export interface ProcessStep {
  id: string
  code?: string
  name: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  updatedAt?: string
}

export interface Segment {
  id: string
  name: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  processes: ProcessStep[]
  updatedAt?: string
}

export interface ProductionLine {
  id: string
  code: string
  name: string
  description: string
  version: number     // 乐观锁版本号
  isActive: boolean
  createdAt: string
  updatedAt: string
  // 核心变更：嵌套的拓扑结构
  segments: Segment[]
}

export interface TopologyTemplate {
  id: string
  name: string
  description?: string
  segments: Segment[]
  createdAt: string
}
