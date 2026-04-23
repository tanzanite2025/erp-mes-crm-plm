export type CuttingIssuanceOrder = {
  id: string
  orderNo: string
  customerName: string
  deliveryDate: string
  status: string
  lines: CuttingIssuanceOrderLine[]
}

export type CuttingIssuanceOrderLine = {
  lineNo: number
  productModel: string
  productCode: string
  productId?: string
  holeCount: number
  quantity: number
}

export type CuttingIssuanceTemplate = {
  id: string
  planName: string
  productModel: string
  productCode: string
  holeCount: number
  version: string
  lineCountPerRim: number
  status: string
  updatedAt: string
}

export type CuttingIssuanceBatch = {
  batchNo: number
  rimQuantity: number
  lineQuantity: number
}

export type CuttingIssuancePreview = {
  order: CuttingIssuanceOrder
  line: CuttingIssuanceOrderLine
  template: CuttingIssuanceTemplate
  totalRimQuantity: number
  totalLineQuantity: number
  batches: CuttingIssuanceBatch[]
}

export type CuttingIssuanceExecutionRecord = {
  id: string
  productionPlanId: string
  orderNo: string
  lineNo: number
  productModel: string
  holeCount: number
  templateName: string
  quantity: number
  totalLineQuantity: number
  batchCount: number
  status: string
  createdAt: string
}

export type CuttingIssuanceExecutionFilters = {
  orderNo?: string
  status?: string
  productModel?: string
  holeCount?: number
  createdAtFrom?: string
  createdAtTo?: string
}

export type CuttingIssuanceFilterDraft = {
  orderNo: string
  productModel: string
  status: string
  holeCount: string
  createdAtFrom: string
  createdAtTo: string
}

export type CuttingIssuanceTraceSummary = {
  executionCount: number
  orderCount: number
  batchCount: number
  totalRimQuantity: number
  totalLineQuantity: number
  earliestCreatedAt: string
  latestCreatedAt: string
}

export type CuttingIssuanceTraceByStatusItem = {
  status: string
  executionCount: number
  totalRimQuantity: number
  totalLineQuantity: number
}

export type CuttingIssuanceTraceByModelItem = {
  productModel: string
  holeCount: number
  executionCount: number
  totalRimQuantity: number
  totalLineQuantity: number
}

export type CuttingIssuanceTraceReport = {
  summary: CuttingIssuanceTraceSummary
  byStatus: CuttingIssuanceTraceByStatusItem[]
  byModel: CuttingIssuanceTraceByModelItem[]
}
