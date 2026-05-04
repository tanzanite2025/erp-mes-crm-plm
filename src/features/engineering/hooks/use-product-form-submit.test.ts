// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { createProductDraft } from '../utils/default-builders'
import { useProductFormSubmit } from './use-product-form-submit'

const { composeSubmitPayloadMock, failLoudlyMock } = vi.hoisted(() => ({
  composeSubmitPayloadMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('../commands/product-command', () => ({
  ProductCommand: {
    composeSubmitPayload: composeSubmitPayloadMock,
    selectVariant: vi.fn((params: { selectedVariants: unknown[] }) => params.selectedVariants),
    setVariantWeight: vi.fn((params: { selectedVariants: unknown[] }) => params.selectedVariants),
  },
}))

describe('useProductFormSubmit', () => {
  beforeEach(() => {
    composeSubmitPayloadMock.mockReset()
    failLoudlyMock.mockReset()
    vi.mocked(toast.error).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.loading).mockReset()
  })

  it('blocks multi-variant submission before calling onSubmit', async () => {
    composeSubmitPayloadMock.mockReturnValue({
      mode: 'multi-variant',
      productsToSave: [
        createProductDraft({ name: 'Variant A', typeId: 'type-1' }),
        createProductDraft({ name: 'Variant B', typeId: 'type-1' }),
      ],
    })

    const onSubmit = vi.fn()
    const onOpenChange = vi.fn()
    const setSelectedVariants = vi.fn()
    const form = {
      getValues: vi.fn(() => 10),
    } as never

    const { result } = renderHook(() => useProductFormSubmit({
      currentRow: undefined,
      isEdit: false,
      form,
      productTypes: [{ id: 'type-1', code: 'FK', name: 'Fork', active: true, sortOrder: 0, version: 1 }],
      selectedVariants: [
        { level: 'V1', weight: 10 },
        { level: 'V2', weight: 11 },
      ],
      setSelectedVariants,
      onOpenChange,
      onSubmit,
      onSaved: vi.fn(),
    }))

    await result.current.handleFormSubmit(createProductDraft({
      name: 'Fork Product',
      typeId: 'type-1',
      modelCode: '01',
    }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(setSelectedVariants).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('engineering.productArchive.toasts.multiVariantSingleSubmitOnly')
  })
})
