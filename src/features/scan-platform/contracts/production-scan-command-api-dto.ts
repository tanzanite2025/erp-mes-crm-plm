export type ProductionScanCommandSource = 'WEB' | 'PDA' | 'USB'

export type ProductionScanCommandAction =
  | 'START'
  | 'COMPLETE'
  | 'HOLD'
  | 'REWORK'

export interface ProductionScanCommandApiRequestDTO {
  productBarcode: string
  executionLotId?: string
  routeId?: string
  routeStepId?: string
  processStepId?: string
  targetRouteStepId?: string
  targetProcessStepId?: string
  executionMode?: string
  partnerId?: string
  action: ProductionScanCommandAction
  result?: string
  notes?: string
  commandSource: ProductionScanCommandSource
  fromHolderType?: string
  fromHolderId?: string
  toHolderType?: string
  toHolderId?: string
}

export interface ProductionOperationExecutionApiDTO {
  id: string
  productBarcode: string
  stateId: string
  executionLotId: string
  routeId: string
  routeStepId: string
  processStepId: string
  executionMode: string
  partnerId: string
  action: string
  status: string
  result: string
  operator: string
  startedAt: string
  completedAt: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ProductBarcodeStateProcessStepApiDTO {
  id: string
  code: string
  name: string
}

export interface ProductBarcodeStateEventApiDTO {
  id: string
  stateId: string
  productBarcode: string
  eventType: string
  fromProcessStepId: string
  toProcessStepId: string
  routeId: string
  routeStepId: string
  operator: string
  payloadSnapshot: string
  occurredAt: string
}

export interface ProductBarcodeStateApiDTO {
  id: string
  productBarcode: string
  productId: string
  productName: string
  routeId: string
  routeStepId: string
  currentProcessStepId: string
  currentProcessStep?: ProductBarcodeStateProcessStepApiDTO
  status: string
  lastEventId: string
  startedAt: string
  completedAt: string
  updatedAt: string
  events: ProductBarcodeStateEventApiDTO[]
}

export interface ProductionScanCommandProgressApiDTO {
  executedRouteStepId: string
  executedProcessStepId: string
  currentRouteStepId: string
  currentProcessStepId: string
  nextRouteStepId: string
  nextProcessStepId: string
  advanced: boolean
  routeCompleted: boolean
  transferRequired: boolean
  nextTransferRequired: boolean
}

export interface ProductBarcodeTransferEventApiDTO {
  id: string
  productBarcode: string
  stateId: string
  operationId: string
  transferType: string
  routeId: string
  fromRouteStepId: string
  toRouteStepId: string
  fromProcessStepId: string
  toProcessStepId: string
  fromHolderType: string
  fromHolderId: string
  toHolderType: string
  toHolderId: string
  operator: string
  payloadSnapshot: string
  occurredAt: string
}

export interface ProductionScanCommandApiResponseDTO {
  commandSource: ProductionScanCommandSource
  operation: ProductionOperationExecutionApiDTO
  state: ProductBarcodeStateApiDTO
  progress: ProductionScanCommandProgressApiDTO
  transferEvents: ProductBarcodeTransferEventApiDTO[]
  message: string
}
