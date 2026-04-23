export type CuttingIssuanceOrder = {
  id: string
  orderNo: string
  customerName: string
  deliveryDate: string
  lines: CuttingIssuanceOrderLine[]
}

export type CuttingIssuanceOrderLine = {
  lineNo: number
  productModel: string
  productCode: string
  productId?: string
  holeCount: number
  requestedQuantity: number
}

export type CuttingIssuanceTemplate = {
  id: string
  planName: string
  productModel: string
  productCode: string
  holeCount: number
  version: string
  templateLineCount: number
  updatedAt: string
}

export type CuttingIssuanceExecutionRecord = {
  id: string
  orderNo: string
  lineNo: number
  productModel: string
  holeCount: number
  templateName: string
  totalLineQuantity: number
  status: string
  createdAt: string
}

export type CuttingIssuanceTraceSummary = {
  executionCount: number
  orderCount: number
  batchCount: number
  totalLineQuantity: number
  earliestCreatedAt: string
  latestCreatedAt: string
}

export type CuttingIssuanceTraceByStatusItem = {
  status: string
  executionCount: number
  totalLineQuantity: number
}

export type CuttingIssuanceTraceByModelItem = {
  productModel: string
  holeCount: number
  executionCount: number
  totalLineQuantity: number
}

export type CuttingIssuanceTraceReport = {
  summary: CuttingIssuanceTraceSummary
  byStatus: CuttingIssuanceTraceByStatusItem[]
  byModel: CuttingIssuanceTraceByModelItem[]
}
