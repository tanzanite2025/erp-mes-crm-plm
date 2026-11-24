export type ProductionScanCommandSource = 'WEB' | 'PDA' | 'USB'

export type ProductionScanCommandAction =
  | 'START'
  | 'COMPLETE'
  | 'HOLD'
  | 'REWORK'

export interface ProductionScanCommandApiRequestDTO {
  idempotencyKey: string
  executionRound?: number
  productBarcode: string
  productionWorkLocationId?: string
  targetRouteStepId?: string
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
  submittedByUserId?: string
  id: string
  executionRound?: number
  productBarcode: string
  stateId: string
  executionLotId: string
  routeId: string
  routeStepId: string
  branchOperationId: string
  productionWorkLocationId: string
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

export interface ProductBarcodeStateBranchOperationApiDTO {
  id: string
  code: string
  name: string
}

export interface ProductBarcodeStateEventApiDTO {
  id: string
  stateId: string
  operationId?: string
  productBarcode: string
  eventType: string
  fromBranchOperationId: string
  toBranchOperationId: string
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
  currentBranchOperationId: string
  currentBranchOperation?: ProductBarcodeStateBranchOperationApiDTO
  status: string
  lastEventId: string
  startedAt: string
  completedAt: string
  updatedAt: string
  events: ProductBarcodeStateEventApiDTO[]
}

export interface ProductBarcodeLifecycleCurrentStateApiDTO {
  id: string
  productBarcode: string
  productId: string
  productName: string
  routeId: string
  routeStepId: string
  currentBranchOperationId: string
  currentBranchOperation?: ProductBarcodeStateBranchOperationApiDTO | null
  status: string
  lastEventId: string
  startedAt: string
  completedAt: string
  updatedAt: string
}

export interface ProductBarcodeLifecycleHistoryApiResponseDTO {
  currentState: ProductBarcodeLifecycleCurrentStateApiDTO
  stateEvents: ProductBarcodeStateEventApiDTO[]
  stateEventTotal: number
  operationExecutions: ProductionOperationExecutionApiDTO[]
  operationExecutionTotal: number
  transferEvents: ProductBarcodeTransferEventApiDTO[]
  transferEventTotal: number
  limit: number
  offset: number
}

export interface ProductionScanCommandProgressApiDTO {
  executedRouteStepId: string
  executedBranchOperationId: string
  currentRouteStepId: string
  currentBranchOperationId: string
  nextRouteStepId: string
  nextBranchOperationId: string
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
  fromBranchOperationId: string
  toBranchOperationId: string
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
