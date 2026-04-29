// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { useProductForm } from './use-product-form'
import { useProductFormInit } from './use-product-form-init'
import { useProductFormDerive } from './use-product-form-derive'
import { useProductFormSubmit } from './use-product-form-submit'

vi.mock('./use-product-form-init', () => ({
  useProductFormInit: vi.fn(),
}))

vi.mock('./use-product-form-derive', () => ({
  useProductFormDerive: vi.fn(),
}))

vi.mock('./use-product-form-submit', () => ({
  useProductFormSubmit: vi.fn(),
}))

type UseProductFormProps = Parameters<typeof useProductForm>[0]

type InitResult = ReturnType<typeof useProductFormInit>
type DeriveResult = ReturnType<typeof useProductFormDerive>
type SubmitResult = ReturnType<typeof useProductFormSubmit>

const useProductFormInitMock = vi.mocked(useProductFormInit)
const useProductFormDeriveMock = vi.mocked(useProductFormDerive)
const useProductFormSubmitMock = vi.mocked(useProductFormSubmit)

function buildInitResult(overrides: Partial<InitResult> = {}): InitResult {
  return {
    attributeCategories: [],
    attributeOptions: [],
    versionLevelOptions: [],
    moldOptions: [],
    specOptions: [],
    metadataInitError: null,
    metadataReady: true,
    ...overrides,
  }
}

function buildDeriveResult(overrides: Partial<DeriveResult> = {}): DeriveResult {
  return {
    dynamicTypes: [],
    specPreviewSummary: '',
    skuPreview: '',
    nextCodeDeriveError: null,
    ...overrides,
  }
}

function buildSubmitResult(overrides: Partial<SubmitResult> = {}): SubmitResult {
  return {
    handleVariantToggle: vi.fn(),
    updateVariantWeight: vi.fn(),
    handleFormSubmit: vi.fn(),
    ...overrides,
  }
}

function buildCurrentRow(options: {
  id: string
  name: string
  description: string
  typeId?: string
  versionLevel?: string
  weight?: number
}) {
  const { id, name, description, typeId = 'type-a', versionLevel = 'V1', weight = 10 } = options
  return createProductDraft({
    id,
    sku: `SKU-${id}`,
    name,
    description,
    typeId,
    weight,
    attributeValues: [
      {
        categoryKey: PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version,
        optionValue: versionLevel,
        sortOrder: 0,
        version: 1,
      },
    ],
  })
}

function buildProps(overrides: Partial<UseProductFormProps> = {}): UseProductFormProps {
  return {
    open: true,
    currentRow: undefined,
    productTypes: [],
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  }
}

describe('useProductForm', () => {
  beforeEach(() => {
    useProductFormInitMock.mockReturnValue(buildInitResult())
    useProductFormDeriveMock.mockReturnValue(buildDeriveResult())
    useProductFormSubmitMock.mockReturnValue(buildSubmitResult())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes on first open when metadata becomes ready', async () => {
    useProductFormInitMock.mockReturnValue(buildInitResult({
      metadataReady: false,
      versionLevelOptions: [{ label: 'V1', value: 'V1' }],
    }))

    const { result, rerender } = renderHook((props: UseProductFormProps) => useProductForm(props), {
      initialProps: buildProps({ open: false }),
    })

    act(() => {
      result.current.form.setValue('name', 'dirty-before-open')
      result.current.form.setValue('description', 'dirty-before-open-description')
    })

    useProductFormInitMock.mockReturnValue(buildInitResult({
      metadataReady: true,
      versionLevelOptions: [{ label: 'V1', value: 'V1' }],
    }))

    rerender(buildProps({ open: true }))

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('')
      expect(result.current.form.getValues('description')).toBe('')
      expect(result.current.selectedVariants).toEqual([{ level: 'V1', weight: undefined }])
    })
  })

  it('re-initializes when the edit target changes', async () => {
    useProductFormInitMock.mockReturnValue(buildInitResult({
      versionLevelOptions: [
        { label: 'V1', value: 'V1' },
        { label: 'V2', value: 'V2' },
      ],
    }))

    const rowA = buildCurrentRow({
      id: 'product-a',
      name: 'Product A',
      description: 'Description A',
      versionLevel: 'V1',
      weight: 11,
    })
    const rowB = buildCurrentRow({
      id: 'product-b',
      name: 'Product B',
      description: 'Description B',
      versionLevel: 'V2',
      weight: 22,
    })

    const { result, rerender } = renderHook((props: UseProductFormProps) => useProductForm(props), {
      initialProps: buildProps({ currentRow: rowA }),
    })

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Product A')
      expect(result.current.selectedVariants).toEqual([{ level: 'V1', weight: 11 }])
    })

    act(() => {
      result.current.form.setValue('description', 'User Override')
    })

    rerender(buildProps({ currentRow: rowB }))

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Product B')
      expect(result.current.form.getValues('description')).toBe('Description B')
      expect(result.current.selectedVariants).toEqual([{ level: 'V2', weight: 22 }])
    })
  })

  it('does not reset the whole form when typeId changes within the same session', async () => {
    useProductFormInitMock.mockReturnValue(buildInitResult())

    const { result, rerender } = renderHook((props: UseProductFormProps) => useProductForm(props), {
      initialProps: buildProps(),
    })

    await waitFor(() => {
      expect(result.current.metadataReady).toBe(true)
    })

    act(() => {
      result.current.form.setValue('name', 'Custom Name')
      result.current.form.setValue('description', 'Custom Description')
      result.current.form.setValue('typeId', 'type-b')
    })

    useProductFormInitMock.mockReturnValue(buildInitResult({
      versionLevelOptions: [{ label: 'V2', value: 'V2' }],
    }))

    rerender(buildProps())

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Custom Name')
      expect(result.current.form.getValues('description')).toBe('Custom Description')
      expect(result.current.form.getValues('typeId')).toBe('type-b')
      expect(result.current.selectedVariants).toEqual([])
    })
  })

  it('does not overwrite user input when metadata becomes ready again in the same session', async () => {
    useProductFormInitMock.mockReturnValue(buildInitResult({
      metadataReady: true,
      versionLevelOptions: [{ label: 'V1', value: 'V1' }],
    }))

    const { result, rerender } = renderHook((props: UseProductFormProps) => useProductForm(props), {
      initialProps: buildProps(),
    })

    await waitFor(() => {
      expect(result.current.selectedVariants).toEqual([{ level: 'V1', weight: undefined }])
    })

    act(() => {
      result.current.form.setValue('name', 'Persisted User Name')
      result.current.form.setValue('description', 'Persisted User Description')
    })

    useProductFormInitMock.mockReturnValue(buildInitResult({
      metadataReady: false,
      versionLevelOptions: [{ label: 'V2', value: 'V2' }],
    }))
    rerender(buildProps())

    useProductFormInitMock.mockReturnValue(buildInitResult({
      metadataReady: true,
      versionLevelOptions: [{ label: 'V2', value: 'V2' }],
    }))
    rerender(buildProps())

    await waitFor(() => {
      expect(result.current.form.getValues('name')).toBe('Persisted User Name')
      expect(result.current.form.getValues('description')).toBe('Persisted User Description')
      expect(result.current.selectedVariants).toEqual([{ level: 'V1', weight: undefined }])
    })
  })
})
