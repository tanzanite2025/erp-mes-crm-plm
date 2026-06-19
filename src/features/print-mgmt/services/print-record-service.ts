import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

export interface PrintBatch {
  id: string
  batchNo: string
  templateName: string
  productId?: string
  bomId?: string
  quantity: number
  activatedCount: number
  status: 'Printed' | 'PartiallyActivated' | 'Activated' | 'Scrapped'
  createdAt: string
  version: number
}

interface PrintBatchApiDTO {
  id: string
  batchNo: string
  templateName: string
  productId?: string
  bomId?: string
  quantity: number
  activatedCount: number
  status: 'Printed' | 'PartiallyActivated' | 'Activated' | 'Scrapped'
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
    quantity: dto.quantity,
    activatedCount: dto.activatedCount,
    status: dto.status,
    createdAt: dto.createdAt,
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
