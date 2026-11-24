import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type {
  IssueProductCodeBatchInput,
  IssuedProductCodeRecord,
  IssuedProductCodeInventoryList,
  IssuedProductCodeInventoryStatus,
  IssuedProductCodeOrderLineIssuanceSummary,
} from '@/lib/product-code/issued-product-code-inventory-contracts'

export interface PrintBatch {
  id: string
  batchNo: string
  templateName: string
  productId?: string
  bomId?: string
  startSn?: string
  endSn?: string
  fullCode?: string
  salesOrderId?: string
  salesOrderLineNo?: number
  quantity: number
  activatedCount: number
  status: 'Printed' | 'PartiallyActivated' | 'Activated' | 'Scrapped'
  createdAt: string
  expiresAt?: string
  version: number
}

interface PrintBatchApiDTO {
  id: string
  batchNo: string
  templateName: string
  productId?: string
  bomId?: string
  startSn?: string
  endSn?: string
  fullCode?: string
  salesOrderId?: string
  salesOrderLineNo?: number
  quantity: number
  activatedCount: number
  status: 'Printed' | 'PartiallyActivated' | 'Activated' | 'Scrapped'
  createdAt: string
  expiresAt?: string
  version?: number
}

interface IssuedProductCodeInventoryApiDTO {
  id: string
  batchId: string
  batchNo: string
  productId: string
  salesOrderId: string
  salesOrderLineNo: number
  code: string
  serialNumber: string
  status: IssuedProductCodeInventoryStatus
  expiresAt: string
  boundAt?: string
  createdAt: string
  version?: number
}

interface IssuedProductCodeOrderLineIssuanceSummaryApiDTO {
  salesOrderLineId: number
  salesOrderLineNo: number
  orderQuantity: number
  issuedQuantity: number
  remainingQuantity: number
}

interface PrintBatchActivateRequestApiDTO {
  count: number
  version: number
  _v: number
}

function toPrintBatchContract(dto: PrintBatchApiDTO): PrintBatch {
  return {
    id: dto.id,
    batchNo: dto.batchNo,
    templateName: dto.templateName,
    productId: dto.productId,
    bomId: dto.bomId,
    startSn: dto.startSn,
    endSn: dto.endSn,
    fullCode: dto.fullCode,
    salesOrderId: dto.salesOrderId,
    salesOrderLineNo: dto.salesOrderLineNo,
    quantity: dto.quantity,
    activatedCount: dto.activatedCount,
    status: dto.status,
    createdAt: dto.createdAt,
    expiresAt: dto.expiresAt,
    version: dto.version ?? 1,
  }
}

function normalizeIssuedProductCodeInventoryRecord(
  dto: IssuedProductCodeInventoryApiDTO
): IssuedProductCodeRecord {
  return {
    ...dto,
    batchNo: String(dto.batchNo ?? '').trim(),
    code: String(dto.code ?? '')
      .trim()
      .toUpperCase(),
    serialNumber: String(dto.serialNumber ?? '').trim(),
    version: dto.version ?? 1,
  }
}

function toPrintBatchActivateRequestApiDTO(
  count: number,
  version: number
): PrintBatchActivateRequestApiDTO {
  return {
    count,
    version,
    _v: version,
  }
}

function toPrintBatchContracts(dtos: PrintBatchApiDTO[]): PrintBatch[] {
  return dtos.map(toPrintBatchContract)
}

export const PrintRecordService = {
  async createLinearBarcodeBatch(input: IssueProductCodeBatchInput): Promise<{
    batch: PrintBatch
    items: IssuedProductCodeRecord[]
  }> {
    const res = await apiFetch<{
      batch: PrintBatchApiDTO
      items: IssuedProductCodeInventoryApiDTO[]
    }>('/print-batches/linear-barcode', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const checked = ensureObjectResponse<
      {
        batch: PrintBatchApiDTO
        items: IssuedProductCodeInventoryApiDTO[]
      } & Record<string, unknown>
    >(res, 'PrintRecordService.createLinearBarcodeBatch')

    if (!Array.isArray(checked.items)) {
      throw new Error(
        '[API_CONTRACT] PrintRecordService.createLinearBarcodeBatch.items must be an array'
      )
    }
    return {
      batch: toPrintBatchContract(checked.batch),
      items: checked.items.map(normalizeIssuedProductCodeInventoryRecord),
    }
  },

  async getLinearBarcodeInventory(input?: {
    salesOrderId?: string
    batchId?: string
    status?: IssuedProductCodeInventoryStatus
    limit?: number
  }): Promise<IssuedProductCodeInventoryList> {
    const query = new URLSearchParams()
    if (input?.salesOrderId) query.set('salesOrderId', input.salesOrderId)
    if (input?.batchId) query.set('batchId', input.batchId)
    if (input?.status) query.set('status', input.status)
    query.set('limit', String(input?.limit ?? 200))
    const res = await apiFetch<{
      items: IssuedProductCodeInventoryApiDTO[]
      total: number
      unattributedIssuedQuantity?: number
      orderLineIssuanceSummaries?: IssuedProductCodeOrderLineIssuanceSummaryApiDTO[]
    }>(`/print-batches/linear-barcode-inventory?${query.toString()}`)
    const checked = ensureObjectResponse<
      {
        items: IssuedProductCodeInventoryApiDTO[]
        total: number
        unattributedIssuedQuantity?: number
        orderLineIssuanceSummaries?: IssuedProductCodeOrderLineIssuanceSummaryApiDTO[]
      } & Record<string, unknown>
    >(res, 'PrintRecordService.getLinearBarcodeInventory')
    if (!Array.isArray(checked.items)) {
      throw new Error(
        '[API_CONTRACT] PrintRecordService.getLinearBarcodeInventory.items must be an array'
      )
    }
    if (
      input?.salesOrderId &&
      !Array.isArray(checked.orderLineIssuanceSummaries)
    ) {
      throw new Error(
        '[API_CONTRACT] PrintRecordService.getLinearBarcodeInventory.orderLineIssuanceSummaries must be an array for an order query'
      )
    }
    return {
      items: checked.items.map(normalizeIssuedProductCodeInventoryRecord),
      total: Number(checked.total ?? checked.items.length),
      unattributedIssuedQuantity:
        checked.unattributedIssuedQuantity === undefined
          ? undefined
          : Number(checked.unattributedIssuedQuantity),
      orderLineIssuanceSummaries: Array.isArray(
        checked.orderLineIssuanceSummaries
      )
        ? checked.orderLineIssuanceSummaries.map(
            (summary): IssuedProductCodeOrderLineIssuanceSummary => ({
              salesOrderLineId: Number(summary.salesOrderLineId),
              salesOrderLineNo: Number(summary.salesOrderLineNo),
              orderQuantity: Number(summary.orderQuantity),
              issuedQuantity: Number(summary.issuedQuantity),
              remainingQuantity: Number(summary.remainingQuantity),
            })
          )
        : undefined,
    }
  },

  async getBatches(): Promise<PrintBatch[]> {
    const res = await apiFetch<PrintBatchApiDTO[]>('/print-batches')
    return toPrintBatchContracts(res)
  },

  async atomicPrint(data: {
    productId: string
    bomId?: string
    templateName: string
    quantity: number
  }): Promise<{ batch: PrintBatch; sn: string }> {
    const res = await apiFetch<{ batch: PrintBatchApiDTO; sn: string }>(
      '/print-batches/atomic-print',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
    const checked = ensureObjectResponse<
      { batch: PrintBatchApiDTO; sn: string } & Record<string, unknown>
    >(res, 'PrintRecordService.atomicPrint') as {
      batch: PrintBatchApiDTO
      sn: string
    }
    return {
      batch: toPrintBatchContract(checked.batch),
      sn: checked.sn,
    }
  },

  async addBatch(
    batch: Omit<
      PrintBatch,
      'id' | 'createdAt' | 'batchNo' | 'activatedCount' | 'status' | 'version'
    >
  ): Promise<PrintBatch> {
    const res = await apiFetch<PrintBatchApiDTO>('/print-batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    })

    return toPrintBatchContract(
      ensureObjectResponse<PrintBatchApiDTO & Record<string, unknown>>(
        res,
        'PrintRecordService.addBatch'
      ) as PrintBatchApiDTO
    )
  },

  async activate(
    id: string,
    count: number,
    version: number
  ): Promise<PrintBatch | null> {
    const res = await apiFetch<PrintBatchApiDTO>(
      `/print-batches/${id}/activate`,
      {
        method: 'POST',
        body: JSON.stringify(toPrintBatchActivateRequestApiDTO(count, version)),
      }
    )

    return toPrintBatchContract(
      ensureObjectResponse<PrintBatchApiDTO & Record<string, unknown>>(
        res,
        'PrintRecordService.activate'
      ) as PrintBatchApiDTO
    )
  },

  async scrap(id: string): Promise<boolean> {
    await apiFetch(`/print-batches/${id}/scrap`, {
      method: 'POST',
    })
    return true
  },
}
