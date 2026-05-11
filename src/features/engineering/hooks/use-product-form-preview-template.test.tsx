// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useForm } from 'react-hook-form'
import { createProductDraft } from '../utils/default-builders'
import { type Product, type ProductTemplate, type ProductType } from '../data/schema'
import { useProductFormPreviewTemplate } from './use-product-form-preview-template'
import { productTemplateService } from '../services/product-template-service'
import { ProductTypeService } from '../services/product-type-service'

vi.mock('../services/product-template-service', () => ({
  productTemplateService: {
    getTemplates: vi.fn(async () => []),
  },
}))

vi.mock('../services/product-type-service', () => ({
  ProductTypeService: {
    getTemplateResolution: vi.fn(async () => ({
      resolvedTemplateId: undefined,
      resolvedTemplateKey: undefined,
      templateResolutionSource: undefined,
      templateResolutionError: undefined,
    })),
  },
}))

const getTemplatesMock = vi.mocked(productTemplateService.getTemplates)
const getTemplateResolutionMock = vi.mocked(ProductTypeService.getTemplateResolution)

function buildProductTypes(): ProductType[] {
  return [
    {
      id: 'type-a',
      name: 'Type A',
      code: 'TA',
      active: true,
      sortOrder: 0,
      version: 1,
    },
  ]
}

function buildTemplate(): ProductTemplate {
  return {
    id: 'template-rim',
    name: '车圈规格',
    code: 'RIM_TEMPLATE',
    componentKey: 'RIM',
    description: '',
    active: true,
    attributeBindings: [
      {
        id: 'template-binding-version',
        templateId: 'template-rim',
        categoryKey: 'versionLevel',
        required: true,
        active: true,
        sortOrder: 0,
        version: 1,
      },
    ],
    createdAt: '2026-04-29T00:00:00.000Z',
    version: 1,
  }
}

describe('useProductFormPreviewTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves backend-authoritative template in create mode', async () => {
    const template = buildTemplate()
    getTemplatesMock.mockResolvedValue([template])
    getTemplateResolutionMock.mockResolvedValue({
      resolvedTemplateId: 'template-rim',
      resolvedTemplateKey: 'RIM',
      templateResolutionSource: 'typeBinding',
      templateResolutionError: undefined,
    })

    const { result } = renderHook(() => {
      const form = useForm<Product>({
        defaultValues: createProductDraft({
          typeId: 'type-a',
        }),
      })

      return useProductFormPreviewTemplate({
        currentRow: undefined,
        form,
        isEdit: false,
        open: true,
        productTypes: buildProductTypes(),
      })
    })

    await waitFor(() => {
      expect(getTemplateResolutionMock).toHaveBeenCalledWith('type-a')
      expect(result.current.boundTemplate?.id).toBe('template-rim')
      expect(result.current.templateResolveError).toBeNull()
      expect(result.current.templateResolutionPending).toBe(false)
    })
  })

  it('resolves current-row authoritative template in edit mode', async () => {
    const template = buildTemplate()
    getTemplatesMock.mockResolvedValue([template])

    const { result } = renderHook(() => {
      const currentRow = createProductDraft({
        id: 'product-rim',
        typeId: 'type-a',
        resolvedTemplateId: 'template-rim',
        resolvedTemplateKey: 'RIM',
        templateResolutionSource: 'backendResolvedTemplate',
      })
      const form = useForm<Product>({
        defaultValues: currentRow,
      })

      return useProductFormPreviewTemplate({
        currentRow,
        form,
        isEdit: true,
        open: true,
        productTypes: buildProductTypes(),
      })
    })

    await waitFor(() => {
      expect(result.current.boundTemplate?.id).toBe('template-rim')
      expect(result.current.templateResolveError).toBeNull()
    })
  })

  it('returns explicit template resolution error when authority cannot resolve a template', async () => {
    getTemplatesMock.mockResolvedValue([])
    getTemplateResolutionMock.mockResolvedValue({
      resolvedTemplateId: undefined,
      resolvedTemplateKey: undefined,
      templateResolutionSource: 'none',
      templateResolutionError: 'missing binding',
    })

    const { result } = renderHook(() => {
      const form = useForm<Product>({
        defaultValues: createProductDraft({
          typeId: 'type-a',
        }),
      })

      return useProductFormPreviewTemplate({
        currentRow: undefined,
        form,
        isEdit: false,
        open: true,
        productTypes: buildProductTypes(),
      })
    })

    await waitFor(() => {
      expect(result.current.boundTemplate).toBeNull()
      expect(result.current.templateResolveError).toContain('Template binding resolution failed:')
    })
  })
})
