// @vitest-environment jsdom
import { useForm } from 'react-hook-form'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type BOM } from '../data/schema'
import {
  createBOMFormValue,
  createEmptyBOMFormValue,
  createEmptyBOMItem,
} from '../utils/bom-form-defaults'
import { useBOMOptimisticLock } from './use-bom-optimistic-lock'
import {
  createBOMPermissionContext,
  useBOMPermissionGuard,
} from './use-bom-permission-guard'
import { useBOMSubmitOrchestrator } from './use-bom-submit-orchestrator'

afterEach(cleanup)

describe('draft persistence returns the real version and retains recipe row identities', () => {
  it('accepts version one returned by an ordinary new draft save', async () => {
    const draft = createEmptyBOMFormValue({ productId: 'product-r50' })
    const saved = { ...draft, id: 'persisted-draft', version: 1 }
    const onSubmit = vi.fn(async () => saved)
    const resetBaseline = vi.fn()
    const { result } = renderHook(() => {
      const form = useForm<BOM>({ defaultValues: draft })
      const optimisticLock = useBOMOptimisticLock()
      const permissionGuard = useBOMPermissionGuard({
        context: createBOMPermissionContext(undefined, false),
      })
      const operations = useBOMSubmitOrchestrator({
        isEdit: false,
        form,
        effectiveProtocolDraft: {
          rootChildren: [],
          branchNodes: [],
          itemNodes: [],
        },
        isSidecarDirty: false,
        permissionGuard,
        optimisticLock,
        deltaTracker: { commitDelta: () => null, resetBaseline },
        onSubmit,
        onClose: vi.fn(),
      })
      return { form, operations, optimisticLock }
    })
    let response: BOM | null = null
    await act(async () => {
      response = await result.current.operations.submit(
        result.current.form.getValues()
      )
    })
    expect(response).toEqual(saved)
    expect(result.current.optimisticLock.hasConflict).toBe(false)
    expect(resetBaseline).toHaveBeenCalledOnce()
  })

  it('assigns permanent UUIDs before new rows enter the relationship builder', () => {
    const first = createEmptyBOMItem('LAYUP')
    const second = createEmptyBOMItem('LAYUP')
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(second.id).not.toBe(first.id)
    const imported = createBOMFormValue({
      initialItems: [{ ...first, id: '' }, second],
      sections: [],
      isEdit: false,
    })
    expect(imported.items[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(imported.items[1].id).toBe(second.id)
  })
})
