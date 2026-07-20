import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

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

export type LinearBarcodeInventoryStatus =
  | 'AVAILABLE'
  | 'BOUND'
  | 'EXPIRED'
  | 'SCRAPPED'

export interface LinearBarcodeInventoryItem {
  id: string
  batchId: string
  batchNo: string
  productId: string
  salesOrderId: string
  salesOrderLineNo: number
  code: string
  serialNumber: string
  status: LinearBarcodeInventoryStatus
  expiresAt: string
  boundAt?: string
  createdAt: string
  version: number
}

export interface CreateLinearBarcodeBatchInput {
  salesOrderId: string
  salesOrderLineNo: number
  quantity: number
}

export interface LinearBarcodeInventoryList {
  items: LinearBarcodeInventoryItem[]
  total: number
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

interface LinearBarcodeInventoryItemApiDTO {
  id: string
  batchId: string
  batchNo: string
  productId: string
  salesOrderId: string
  salesOrderLineNo: number
  code: string
  serialNumber: string
  status: LinearBarcodeInventoryStatus
  expiresAt: string
  boundAt?: string
  createdAt: string
  version?: number
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

function toLinearBarcodeInventoryItem(
  dto: LinearBarcodeInventoryItemApiDTO
): LinearBarcodeInventoryItem {
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
  async createLinearBarcodeBatch(
    input: CreateLinearBarcodeBatchInput
  ): Promise<{
    batch: PrintBatch
    items: LinearBarcodeInventoryItem[]
  }> {
    const res = await apiFetch<{
      batch: PrintBatchApiDTO
      items: LinearBarcodeInventoryItemApiDTO[]
    }>('/print-batches/linear-barcode', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const checked = ensureObjectResponse<
      {
        batch: PrintBatchApiDTO
        items: LinearBarcodeInventoryItemApiDTO[]
      } & Record<string, unknown>
    >(res, 'PrintRecordService.createLinearBarcodeBatch')

    if (!Array.isArray(checked.items)) {
      throw new Error(
        '[API_CONTRACT] PrintRecordService.createLinearBarcodeBatch.items must be an array'
      )
    }
    return {
      batch: toPrintBatchContract(checked.batch),
      items: checked.items.map(toLinearBarcodeInventoryItem),
    }
  },

  async getLinearBarcodeInventory(input?: {
    salesOrderId?: string
    batchId?: string
    status?: LinearBarcodeInventoryStatus
    limit?: number
  }): Promise<LinearBarcodeInventoryList> {
    const query = new URLSearchParams()
    if (input?.salesOrderId) query.set('salesOrderId', input.salesOrderId)
    if (input?.batchId) query.set('batchId', input.batchId)
    if (input?.status) query.set('status', input.status)
    query.set('limit', String(input?.limit ?? 200))
    const res = await apiFetch<{
      items: LinearBarcodeInventoryItemApiDTO[]
      total: number
    }>(`/print-batches/linear-barcode-inventory?${query.toString()}`)
    const checked = ensureObjectResponse<
      {
        items: LinearBarcodeInventoryItemApiDTO[]
        total: number
      } & Record<string, unknown>
    >(res, 'PrintRecordService.getLinearBarcodeInventory')
    if (!Array.isArray(checked.items)) {
      throw new Error(
        '[API_CONTRACT] PrintRecordService.getLinearBarcodeInventory.items must be an array'
      )
    }
    return {
      items: checked.items.map(toLinearBarcodeInventoryItem),
      total: Number(checked.total ?? checked.items.length),
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
