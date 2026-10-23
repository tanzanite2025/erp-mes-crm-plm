// @vitest-environment jsdom
import { useForm } from 'react-hook-form'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bomSectionOptionSchema } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import {
  createEmptyBOMFormValue,
  createEmptyBOMItem,
} from '../utils/bom-form-defaults'
import { useBOMFormInitialization } from './use-bom-form-initialization'

const initialSections = [
  bomSectionOptionSchema.parse({
    value: 'LAYUP',
    label: '叠层',
    code: 'LAYUP',
    name: '叠层',
    isDefault: true,
  }),
]

function useBOMEditingSessionInitializationFixture(props: {
  open: boolean
  isReferenceDataReady: boolean
  sections: typeof initialSections
  currentRow?: BOM
}) {
  const form = useForm<BOM>({ defaultValues: createEmptyBOMFormValue() })
  useBOMFormInitialization({
    ...props,
    form,
    isEdit: Boolean(props.currentRow),
    initialProductId: 'model-a',
  })
  return form
}

describe('BOM editing session initialization and catalog refresh draft preservation', () => {
  it('waits for references, preserves the draft on refresh and starts fresh after close and reopen', () => {
    const props = {
      open: true,
      isReferenceDataReady: false,
      sections: initialSections,
    }
    const { result, rerender } = renderHook(
      useBOMEditingSessionInitializationFixture,
      { initialProps: props }
    )
    expect(result.current.getValues('productId')).toBe('')
    rerender({ ...props, isReferenceDataReady: true })
    expect(result.current.getValues('productId')).toBe('model-a')
    act(() => {
      result.current.setValue('description', '正在编写')
      result.current.setValue('versionLevel', 'lightweight')
      result.current.setValue('measuredWeight', 420)
      result.current.setValue('items', [
        { ...createEmptyBOMItem('LAYUP'), materialId: 'carbon', unitUsage: 4 },
      ])
    })
    rerender({
      ...props,
      isReferenceDataReady: true,
      sections: initialSections.map((section) => ({
        ...section,
        name: '碳布叠层',
      })),
    })
    expect(result.current.getValues()).toMatchObject({
      description: '正在编写',
      versionLevel: 'lightweight',
      measuredWeight: 420,
      items: [{ unitUsage: 4 }],
    })
    rerender({ ...props, open: false, isReferenceDataReady: true })
    rerender({ ...props, isReferenceDataReady: true })
    expect(result.current.getValues()).toMatchObject({
      description: '',
      versionLevel: '',
      measuredWeight: 0,
      items: [],
    })
  })

  it('initializes another BOM record but preserves edits when the same record detail refreshes', () => {
    const firstRecord = createEmptyBOMFormValue({
      id: 'bom-a',
      productId: 'model-a',
      description: '第一份记录',
    })
    const props = {
      open: true,
      isReferenceDataReady: true,
      sections: initialSections,
      currentRow: firstRecord,
    }
    const { result, rerender } = renderHook(
      useBOMEditingSessionInitializationFixture,
      { initialProps: props }
    )
    act(() => result.current.setValue('description', '第一份未保存草稿'))
    rerender({
      ...props,
      currentRow: { ...firstRecord, version: 2, description: '服务器更新' },
    })
    expect(result.current.getValues('description')).toBe('第一份未保存草稿')
    rerender({
      ...props,
      currentRow: { ...firstRecord, id: 'bom-b', description: '第二份记录' },
    })
    expect(result.current.getValues()).toMatchObject({
      id: 'bom-b',
      description: '第二份记录',
    })
  })
})
