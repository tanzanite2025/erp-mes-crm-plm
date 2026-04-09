import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { handleServerError } from '@/lib/handle-server-error'
import { type DeltaSet } from '@/lib/delta/types'
import { type Supplier } from '../../data/schema'
import { changeSupplierIdentity, changeSupplierStatus, createSupplier, deleteSupplier, getSupplierList, getSuppliers, patchSupplier, saveSupplier } from '../services/supplier-service'

export const useGetSuppliers = (options = {}) => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    ...options,
  })
}

export const useGetSupplierList = (options = {}) => {
  return useQuery({
    queryKey: ['suppliers', 'list'],
    queryFn: getSupplierList,
    ...options,
  })
}

export const useSupplierMutations = () => {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: Omit<Supplier, 'id' | 'version'>) => {
      return createSupplier(data)
    },
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, delta, version }: { id: string; delta: DeltaSet; version: number }) => {
      return patchSupplier(id, delta, version)
    },
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  const saveMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      finalData,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      delta: DeltaSet
      finalData: Supplier
      operator: string
      expectedVersion: number
      actorId?: string
    }) => saveSupplier(id, { delta, finalData, operator, expectedVersion, actorId }),
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  const statusChangeMutation = useMutation({
    mutationFn: ({
      id,
      status,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      status: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSupplierStatus(id, { status, operator, expectedVersion, actorId }),
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  const identityChangeMutation = useMutation({
    mutationFn: ({
      id,
      code,
      name,
      operator,
      expectedVersion,
      actorId,
    }: {
      id: string
      code?: string
      name?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => changeSupplierIdentity(id, { code, name, operator, expectedVersion, actorId }),
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.saved'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      toast.success(t('purchase.suppliers.toasts.deleted'))
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'list'] })
    },
    onError: handleServerError,
  })

  return { createMutation, saveMutation, patchMutation, statusChangeMutation, identityChangeMutation, deleteMutation }
}
