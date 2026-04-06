export interface WheelBarcodeSnapshot {
  rawCode: string
  protocol: string
  productionDate?: string
  shortTag?: string
  year?: string
  monthCode?: string
  day?: string
  modelCode?: string
  appearanceCode?: string
  holePrefix?: string
  holes?: string
  serial?: string
}

export interface WheelIdentitySnapshot {
  productId?: string
  productName?: string
  productSku?: string
  modelCode?: string
  modelName?: string
  appearanceCode?: string
  appearanceLabel?: string
}

export interface WheelTraceStageSnapshot {
  status: 'resolved' | 'partial' | 'unknown'
  lineId?: string
  lineCode?: string
  lineName?: string
  segmentId?: string
  segmentName?: string
  processId?: string
  processCode?: string
  processName?: string
  teamId?: string
  teamName?: string
  operatorId?: string
  operatorName?: string
  scannedAt?: string
}

export interface WheelTraceTimelineNode {
  id: string
  time: string
  title: string
  description: string
  type: 'production' | 'quality' | 'warehouse' | 'logistics' | 'system'
  segmentName?: string
  processName?: string
  operatorName?: string
  status?: string
}

export interface WheelTracePayload {
  summary: string
  barcode: WheelBarcodeSnapshot
  identity: WheelIdentitySnapshot
  currentStage: WheelTraceStageSnapshot
  timeline: WheelTraceTimelineNode[]
  warnings: string[]
}
