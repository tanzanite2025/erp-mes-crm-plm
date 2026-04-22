import { apiFetch } from '@/lib/api-client'
import { type ProductAppearance, type ProductAppearanceDraft } from '../data/product-appearance'

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

function normalizeProductAppearance(item: ProductAppearance): ProductAppearance {
  return {
    ...item,
    imageUrl: item.imageUrl || '',
    imageThumbnailUrl: item.imageThumbnailUrl || item.imageUrl || '',
    imageName: item.imageName || '',
    version: Number.isFinite(item.version) ? item.version : 1,
  }
}

function toProductAppearanceContract(dto: ProductAppearanceApiDTO): ProductAppearance {
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

function sortProductAppearances(items: ProductAppearance[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.barcodeCode !== right.barcodeCode) {
      return left.barcodeCode.localeCompare(right.barcodeCode)
    }

    return left.name.localeCompare(right.name)
  })
}

function buildAppearanceId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `appearance_${Date.now()}`
}

export const productAppearanceService = {
  async getProductAppearances(): Promise<ProductAppearance[]> {
    const items = await apiFetch<ProductAppearanceApiDTO[]>('/engineering/product-appearances')
    return sortProductAppearances(items.map(toProductAppearanceContract))
  },

  async saveProductAppearance(draft: ProductAppearanceDraft): Promise<ProductAppearance[]> {
    await apiFetch<ProductAppearanceApiDTO>('/engineering/product-appearances', {
      method: 'POST',
      body: JSON.stringify({
        id: draft.id?.trim() || buildAppearanceId(),
      name: draft.name.trim(),
      barcodeCode: draft.barcodeCode.trim(),
      description: draft.description.trim(),
      imageUrl: draft.imageUrl?.trim() || '',
      imageThumbnailUrl: draft.imageThumbnailUrl?.trim() || draft.imageUrl?.trim() || '',
      imageName: draft.imageName?.trim() || '',
      active: draft.active,
      sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
        version: draft.version ?? 0,
      }),
    })
    return this.getProductAppearances()
  },

  async deleteProductAppearance(id: string): Promise<ProductAppearance[]> {
    await apiFetch(`/engineering/product-appearances/${id}`, {
      method: 'DELETE',
    })
    return this.getProductAppearances()
  },
}
