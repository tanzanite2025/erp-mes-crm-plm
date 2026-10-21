import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  sortProductAppearanceCatalog,
  type ProductAppearance,
  type ProductAppearanceDraft,
} from '../data/product-appearance'

interface ProductAppearanceApiDTO {
  id: string
  name: string
  barcodeCode: string
  description?: string
  imageUrl?: string
  imageThumbnailUrl?: string
  imageName?: string
  active?: boolean
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
  version?: number
}

function normalizeProductAppearance(
  item: ProductAppearance
): ProductAppearance {
  return {
    ...item,
    imageUrl: item.imageUrl || '',
    imageThumbnailUrl: item.imageThumbnailUrl || item.imageUrl || '',
    imageName: item.imageName || '',
    version: Number.isFinite(item.version) ? item.version : 1,
  }
}

function toProductAppearanceContract(
  dto: ProductAppearanceApiDTO
): ProductAppearance {
  return normalizeProductAppearance({
    id: dto.id,
    name: dto.name || '',
    barcodeCode: dto.barcodeCode || '',
    description: dto.description || '',
    imageUrl: dto.imageUrl || '',
    imageThumbnailUrl: dto.imageThumbnailUrl || dto.imageUrl || '',
    imageName: dto.imageName || '',
    active: dto.active ?? true,
    sortOrder: Number(dto.sortOrder) || 0,
    createdAt: dto.createdAt || '',
    updatedAt: dto.updatedAt || '',
    version: dto.version ?? 1,
  })
}

export const productAppearanceService = {
  async getProductAppearances(): Promise<ProductAppearance[]> {
    const items = await apiFetch<ProductAppearanceApiDTO[]>(
      '/engineering/product-appearances'
    )
    return sortProductAppearanceCatalog(
      ensureArrayResponse<ProductAppearanceApiDTO>(
        items,
        'productAppearanceService.getProductAppearances'
      ).map(toProductAppearanceContract)
    )
  },

  async saveProductAppearance(
    draft: ProductAppearanceDraft,
    current?: ProductAppearance
  ): Promise<ProductAppearance> {
    const normalizedDraft = {
      id: draft.id?.trim() || globalThis.crypto.randomUUID(),
      name: draft.name.trim(),
      barcodeCode: draft.barcodeCode.trim(),
      description: draft.description.trim(),
      imageUrl: draft.imageUrl?.trim() || '',
      imageThumbnailUrl:
        draft.imageThumbnailUrl?.trim() || draft.imageUrl?.trim() || '',
      imageName: draft.imageName?.trim() || '',
      active: draft.active,
      sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
      version: draft.version ?? 0,
    }
    let payload: typeof normalizedDraft | DeltaPayload = normalizedDraft
    if (current) {
      if (
        current.id !== normalizedDraft.id ||
        !Number.isSafeInteger(current.version) ||
        current.version < 1
      ) {
        throw new Error(
          'Invalid original product appearance or version. Reopen the editor.'
        )
      }
      const delta: DeltaSet = {}
      const editableFields = [
        'name',
        'barcodeCode',
        'description',
        'imageUrl',
        'imageThumbnailUrl',
        'imageName',
        'active',
        'sortOrder',
      ] as const
      for (const field of editableFields) {
        if (normalizedDraft[field] !== current[field]) {
          delta[field] = { o: current[field], n: normalizedDraft[field] }
        }
      }
      if (Object.keys(delta).length === 0) return current
      payload = {
        op: 'PATCH',
        delta,
        metadata: {
          id: current.id,
          version: current.version,
          intent: 'PRODUCT_APPEARANCE_SAVE',
        },
      }
    } else if (normalizedDraft.version > 0) {
      throw new Error(
        'Editing a product appearance requires its original record.'
      )
    }
    const saved = await apiFetch<ProductAppearanceApiDTO>(
      current
        ? `/engineering/product-appearances/${encodeURIComponent(current.id)}`
        : '/engineering/product-appearances',
      { method: current ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
    )
    return toProductAppearanceContract(
      ensureObjectResponse<ProductAppearanceApiDTO & Record<string, unknown>>(
        saved,
        'productAppearanceService.saveProductAppearance'
      )
    )
  },

  async deleteProductAppearance(id: string): Promise<void> {
    await apiFetch(
      `/engineering/product-appearances/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )
  },
}
