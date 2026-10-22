// @vitest-environment jsdom
import { useForm } from 'react-hook-form'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../data/schema'
import { createProductDraft } from '../utils/default-builders'
import { useProductFormSubmit } from './use-product-form-submit'

const saveFeedback = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock('sonner', () => ({ toast: saveFeedback }))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ locale: 'zh-CN', t: (key: string) => key }),
}))

describe('product form completion waits for a successful save', () => {
  it.each(['null-result', 'rejected-request'] as const)(
    'keeps the dialog and guide step open on %s',
    async (failureMode) => {
      const onSaved = vi.fn()
      const onOpenChange = vi.fn()
      const onSubmit = vi.fn(async () => {
        if (failureMode === 'rejected-request') throw new Error('Save failed')
        return null
      })
      const { result } = renderHook(() =>
        useProductFormSubmit({
          isEdit: false,
          form: useForm<Product>(),
          productTypes: [],
          onSubmit,
          onSaved,
          onOpenChange,
        })
      )
      await act(async () => {
        const saveRequest = result.current.handleFormSubmit(
          createProductDraft({ typeId: 'base-model' })
        )
        if (failureMode === 'rejected-request')
          await expect(saveRequest).rejects.toThrow('Save failed')
        else await saveRequest
      })
      expect(onSubmit).toHaveBeenCalledOnce()
      expect(onSaved).not.toHaveBeenCalled()
      expect(onOpenChange).not.toHaveBeenCalled()
      expect(saveFeedback.success).not.toHaveBeenCalled()
    }
  )

  it('reports the actual saved record before closing the dialog', async () => {
    const savedProduct = createProductDraft({
      id: 'saved-product',
      name: 'Saved product',
    })
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    const { result } = renderHook(() =>
      useProductFormSubmit({
        isEdit: false,
        form: useForm<Product>(),
        productTypes: [],
        onSubmit: async () => [savedProduct],
        onSaved,
        onOpenChange,
      })
    )
    await act(async () => {
      await result.current.handleFormSubmit(savedProduct)
    })
    expect(onSaved).toHaveBeenCalledWith([savedProduct])
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(saveFeedback.success).toHaveBeenCalledOnce()
  })
})
