// @vitest-environment jsdom
import { useForm } from 'react-hook-form'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import { createProductDraft } from '../utils/default-builders'
import { useProductFormPreviewTemplate } from './use-product-form-preview-template'

const templateResolutionResources = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  getTemplateResolution: vi.fn(),
}))
vi.mock('../services/product-template-service', () => ({
  productTemplateService: {
    getTemplates: templateResolutionResources.getTemplates,
  },
}))
vi.mock('../services/product-type-service', () => ({
  ProductTypeService: {
    getTemplateResolution: templateResolutionResources.getTemplateResolution,
  },
}))

const productTypes: ProductType[] = [
  {
    id: 'rim-model',
    name: 'R50',
    code: 'R50',
    templateId: 'rim-template',
    active: true,
    sortOrder: 1,
    version: 1,
  },
  {
    id: 'fork-model',
    name: 'F50',
    code: 'F50',
    templateId: 'fork-template',
    active: true,
    sortOrder: 2,
    version: 1,
  },
]
const currentProduct = createProductDraft({
  id: 'existing-product',
  typeId: 'rim-model',
  resolvedTemplateId: 'rim-template',
  resolvedTemplateKey: 'GENERAL',
})

function buildIndependentTemplateForProductFormResolutionTest(
  id: string,
  name: string
): ProductTemplate {
  return {
    id,
    name,
    code: id,
    componentKey: 'GENERAL',
    active: true,
    attributeBindings: [],
    createdAt: '2026-10-22T00:00:00Z',
    version: 1,
  }
}

function renderProductFormTemplateResolutionForVerification(
  initialOpen = true
) {
  return renderHook(
    ({ open }) => {
      const form = useForm<Product>({ defaultValues: currentProduct })
      return {
        form,
        ...useProductFormPreviewTemplate({
          currentRow: currentProduct,
          form,
          isEdit: true,
          open,
          productTypes,
        }),
      }
    },
    { initialProps: { open: initialOpen } }
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  templateResolutionResources.getTemplates.mockResolvedValue([
    buildIndependentTemplateForProductFormResolutionTest(
      'rim-template',
      '车圈'
    ),
    buildIndependentTemplateForProductFormResolutionTest(
      'fork-template',
      '前叉'
    ),
  ])
  templateResolutionResources.getTemplateResolution.mockImplementation(
    async (typeId: string) => ({
      resolvedTemplateId:
        typeId === 'rim-model' ? 'rim-template' : 'fork-template',
      resolvedTemplateKey: 'GENERAL',
      templateResolutionSource: 'typeBinding',
      templateResolutionError: '',
    })
  )
})
afterEach(cleanup)

describe('product form template resolution lifecycle and identity isolation', () => {
  it('does not load template definitions while its dialog is closed', async () => {
    renderProductFormTemplateResolutionForVerification(false)
    await act(async () => {})
    expect(templateResolutionResources.getTemplates).not.toHaveBeenCalled()
  })

  it('reloads definitions when reopening the same product', async () => {
    const { result, rerender } =
      renderProductFormTemplateResolutionForVerification()
    await waitFor(() => expect(result.current.boundTemplate?.name).toBe('车圈'))
    rerender({ open: false })
    templateResolutionResources.getTemplates.mockResolvedValue([
      buildIndependentTemplateForProductFormResolutionTest(
        'rim-template',
        '远端更新的车圈'
      ),
    ])
    rerender({ open: true })
    await waitFor(() =>
      expect(result.current.boundTemplate?.name).toBe('远端更新的车圈')
    )
  })

  it('resolves the newly selected model instead of retaining the edited product’s old template', async () => {
    const { result } = renderProductFormTemplateResolutionForVerification()
    await waitFor(() =>
      expect(result.current.boundTemplate?.id).toBe('rim-template')
    )
    let finishResolution!: (value: {
      resolvedTemplateId: string
      resolvedTemplateKey: string
    }) => void
    templateResolutionResources.getTemplateResolution.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishResolution = resolve
        })
    )
    act(() => result.current.form.setValue('typeId', 'fork-model'))
    expect(result.current.boundTemplate).toBeNull()
    expect(result.current.templateResolutionPending).toBe(true)
    await act(async () =>
      finishResolution({
        resolvedTemplateId: 'fork-template',
        resolvedTemplateKey: 'GENERAL',
      })
    )
    await waitFor(() =>
      expect(result.current.boundTemplate?.id).toBe('fork-template')
    )
  })

  it('does not substitute another template with the same form component when the bound template is missing', async () => {
    templateResolutionResources.getTemplates.mockResolvedValue([
      buildIndependentTemplateForProductFormResolutionTest(
        'fork-template',
        '前叉'
      ),
    ])
    const { result } = renderProductFormTemplateResolutionForVerification()
    await waitFor(() =>
      expect(result.current.templateResolveError).toBeTruthy()
    )
    expect(result.current.boundTemplate).toBeNull()
    expect(result.current.templateResolutionPending).toBe(false)
  })

  it('ignores a late response from a model that is no longer selected', async () => {
    const { result } = renderProductFormTemplateResolutionForVerification()
    await waitFor(() =>
      expect(result.current.boundTemplate?.id).toBe('rim-template')
    )
    let finishOlderResolution!: (value: {
      resolvedTemplateId: string
      resolvedTemplateKey: string
    }) => void
    templateResolutionResources.getTemplateResolution.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOlderResolution = resolve
        })
    )
    act(() => result.current.form.setValue('typeId', 'fork-model'))
    expect(result.current.templateResolutionPending).toBe(true)
    act(() => result.current.form.setValue('typeId', 'rim-model'))
    await waitFor(() =>
      expect(result.current.boundTemplate?.id).toBe('rim-template')
    )
    await act(async () =>
      finishOlderResolution({
        resolvedTemplateId: 'fork-template',
        resolvedTemplateKey: 'GENERAL',
      })
    )
    expect(result.current.boundTemplate?.id).toBe('rim-template')
    expect(result.current.templateResolutionPending).toBe(false)
  })

  it('clears an earlier lookup error and retries after closing and reopening', async () => {
    templateResolutionResources.getTemplates.mockRejectedValueOnce(
      new Error('Temporary read failure')
    )
    const { result, rerender } =
      renderProductFormTemplateResolutionForVerification()
    await waitFor(() =>
      expect(result.current.templateResolveError).toContain(
        'Temporary read failure'
      )
    )
    rerender({ open: false })
    rerender({ open: true })
    await waitFor(() =>
      expect(result.current.boundTemplate?.id).toBe('rim-template')
    )
    expect(result.current.templateResolveError).toBeNull()
  })
})
