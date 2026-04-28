import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { getErrorStatus, isNotFoundError } from '@/lib/error-status'
import { useGetSuppliers } from '@/features/trading/supplier'
import type { PrepregSupplierOption } from '../components/prepreg-catalog-form'
import {
  buildPrepregSpecPayload,
  cleanPrepregDimensionFields,
  cleanPrepregResinBatchFields,
  EMPTY_PREPREG_FORM,
  formFromPrepregSpec,
  mergePrepregRecognizedFields,
  type PrepregCleanedDimensionFields,
  type PrepregCleanedResinBatchFields,
  type PrepregFormState,
  type PrepregMaterialSpec,
} from '../data/prepreg-material-spec-schema'
import { PrepregMaterialSpecService } from '../services/prepreg-material-spec-service'
import { extractPrepregBindingToken } from '../prepreg-binding-qr/services/prepreg-binding-token-service'

const prepregCatalogRouteApi = getRouteApi('/_authenticated/raw-materials/catalog')

interface SupplierLike {
  id: string
  code: string
  name: string
  status: string
}

export interface UsePrepregCatalogPageStateResult {
  searchTerm: string
  setSearchTerm: (value: string) => void
  specs: PrepregMaterialSpec[]
  isLoading: boolean
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  editingSpec: PrepregMaterialSpec | null
  form: PrepregFormState
  updateForm: <K extends keyof PrepregFormState>(key: K, value: PrepregFormState[K]) => void
  supplierOptions: PrepregSupplierOption[]
  supplierSelectValue?: string
  isSupplierLoading: boolean
  onSupplierChange: (value: string) => void
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
  openCreate: () => void
  openEdit: (spec: PrepregMaterialSpec) => void
  bindingTokenDialogOpen: boolean
  setBindingTokenDialogOpen: (open: boolean) => void
  submitBindingTokenInput: (value: string) => void
  activeBindingToken: string
  applyRecognizedFields: (fields: Partial<PrepregFormState>) => void
  handleSave: () => void
  isSaving: boolean
}

function supplierLabel(supplier: Pick<SupplierLike, 'code' | 'name'>): string {
  const code = supplier.code.trim()
  const name = supplier.name.trim()
  if (code && name) return `${code} / ${name}`
  return code || name
}

function supplierSnapshot(supplier: Pick<SupplierLike, 'code' | 'name'>): string {
  const code = supplier.code.trim()
  const name = supplier.name.trim()
  return code || name
}

export function usePrepregCatalogPageState(): UsePrepregCatalogPageStateResult {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const search = prepregCatalogRouteApi.useSearch()
  const navigate = prepregCatalogRouteApi.useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<PrepregMaterialSpec | null>(null)
  const [form, setForm] = useState<PrepregFormState>(EMPTY_PREPREG_FORM)
  const [bindingTokenDialogOpen, setBindingTokenDialogOpen] = useState(false)
  const [activeBindingToken, setActiveBindingToken] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', 'prepreg-specs', searchTerm],
    queryFn: () => PrepregMaterialSpecService.list(searchTerm, 1, 200),
  })
  const { data: suppliers = [], isLoading: isSupplierLoading } = useGetSuppliers({
    enabled: dialogOpen,
  })

  const specs = useMemo(() => data?.items ?? [], [data?.items])
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === 'Active'),
    [suppliers]
  )

  const resetDialogState = useCallback(() => {
    setDialogOpen(false)
    setEditingSpec(null)
    setForm(EMPTY_PREPREG_FORM)
    setActiveBindingToken('')
  }, [])

  const { mutate: savePrepregSpec, isPending: isSaving } = useMutation({
    mutationFn: (payload: Partial<PrepregMaterialSpec>) =>
      PrepregMaterialSpecService.save({
        ...payload,
        bindToken: activeBindingToken || undefined,
      }),
    onSuccess: async () => {
      const usedBindingToken = activeBindingToken
      await queryClient.invalidateQueries({
        queryKey: ['raw-materials', 'prepreg-specs'],
      })
      if (usedBindingToken) {
        toast.success(t('rawMaterials.catalog.toasts.bindingSaved'))
      } else {
        toast.success(
          editingSpec
            ? t('rawMaterials.catalog.toasts.updated')
            : t('rawMaterials.catalog.toasts.created')
        )
      }
      resetDialogState()
    },
    onError: (error) => {
      const status = getErrorStatus(error)
      if (status === 409 && activeBindingToken) {
        toast.error(t('rawMaterials.catalog.toasts.bindingAlreadyBound'))
        return
      }
      if (status === 410 && activeBindingToken) {
        toast.error(t('rawMaterials.catalog.toasts.bindingExpired'))
        return
      }
      if (status === 400 && activeBindingToken) {
        toast.error(t('rawMaterials.catalog.toasts.bindingInvalid'))
        return
      }
      toast.error(
        error instanceof Error
          ? error.message
          : t('rawMaterials.catalog.toasts.saveFailed')
      )
    },
  })

  const openCreate = useCallback(() => {
    setEditingSpec(null)
    setForm(EMPTY_PREPREG_FORM)
    setActiveBindingToken('')
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((spec: PrepregMaterialSpec) => {
    setEditingSpec(spec)
    setForm(formFromPrepregSpec(spec))
    setActiveBindingToken('')
    setDialogOpen(true)
  }, [])

  const setDialogOpenSafely = useCallback(
    (open: boolean) => {
      if (open) {
        setDialogOpen(true)
        return
      }
      resetDialogState()
    },
    [resetDialogState]
  )

  const updateForm = useCallback(
    <K extends keyof PrepregFormState>(key: K, value: PrepregFormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const cleanedDimensions = useMemo(
    () =>
      cleanPrepregDimensionFields({
        widthMm: form.widthMm,
        nominalAreaM2: form.nominalAreaM2,
        fallbackLengthM: editingSpec?.lengthM || '',
      }),
    [editingSpec?.lengthM, form.nominalAreaM2, form.widthMm]
  )
  const cleanedResinBatch = useMemo(
    () =>
      cleanPrepregResinBatchFields({
        resinContentBatchRaw: form.resinContentBatchRaw,
      }),
    [form.resinContentBatchRaw]
  )

  const supplierOptions = useMemo<PrepregSupplierOption[]>(() => {
    const options = activeSuppliers
      .map((supplier) => ({
        value: supplier.id,
        label: supplierLabel(supplier),
      }))
      .filter((item) => item.label)

    const hasCurrentSupplierId =
      !!form.supplierId &&
      options.some((option) => option.value === form.supplierId)
    if (form.supplierId && !hasCurrentSupplierId) {
      options.unshift({
        value: form.supplierId,
        label: `${t('rawMaterials.catalog.form.supplier.legacyIdPrefix')} ${form.supplierProductCode || form.supplierId}`,
      })
    }

    if (!form.supplierId && form.supplierProductCode.trim()) {
      options.unshift({
        value: `legacy:${form.supplierProductCode.trim()}`,
        label: `${t('rawMaterials.catalog.form.supplier.legacyPrefix')} ${form.supplierProductCode.trim()}`,
      })
    }

    return options
  }, [activeSuppliers, form.supplierId, form.supplierProductCode, t])

  const supplierSelectValue = useMemo(() => {
    if (form.supplierId.trim()) return form.supplierId.trim()
    if (form.supplierProductCode.trim()) {
      return `legacy:${form.supplierProductCode.trim()}`
    }
    return undefined
  }, [form.supplierId, form.supplierProductCode])

  const onSupplierChange = useCallback(
    (nextValue: string) => {
      if (nextValue.startsWith('legacy:')) {
        const legacyCode = nextValue.replace(/^legacy:/, '').trim()
        setForm((current) => ({
          ...current,
          supplierId: '',
          supplierProductCode: legacyCode,
        }))
        return
      }

      const selectedSupplier = activeSuppliers.find(
        (supplier) => supplier.id === nextValue
      )
      if (!selectedSupplier) {
        setForm((current) => ({
          ...current,
          supplierId: '',
          supplierProductCode: '',
        }))
        return
      }

      setForm((current) => ({
        ...current,
        supplierId: selectedSupplier.id,
        supplierProductCode: supplierSnapshot(selectedSupplier),
      }))
    },
    [activeSuppliers]
  )

  const applyRecognizedFields = useCallback(
    (fields: Partial<PrepregFormState>) => {
      setForm((current) => mergePrepregRecognizedFields(current, fields))
      toast.success(t('rawMaterials.catalog.toasts.recognizedApplied'))
    },
    [t]
  )

  const consumeBindingToken = useCallback(
    async (value: string) => {
      const token = extractPrepregBindingToken(value)
      if (!value.trim()) return

      if (!token) {
        toast.error(t('rawMaterials.catalog.toasts.bindingInvalid'))
        return
      }

      try {
        const resolved = await PrepregMaterialSpecService.getBindingToken(token)

        if (resolved.status === 'BOUND' && resolved.specId) {
          const existingSpec = specs.find((item) => item.id === resolved.specId)
          toast.error(t('rawMaterials.catalog.toasts.bindingAlreadyBound'))
          setBindingTokenDialogOpen(false)
          if (existingSpec) {
            openEdit(existingSpec)
            return
          }

          const detailSpec = await PrepregMaterialSpecService.getById(resolved.specId)
          openEdit(detailSpec)
          return
        }

        setBindingTokenDialogOpen(false)
        setEditingSpec(null)
        setForm(EMPTY_PREPREG_FORM)
        setActiveBindingToken(token)
        setDialogOpen(true)
        toast.success(t('rawMaterials.catalog.toasts.bindingActivated'))
      } catch (error) {
        const status = getErrorStatus(error)
        if (status === 410) {
          toast.error(t('rawMaterials.catalog.toasts.bindingExpired'))
          return
        }
        if (status === 400 || isNotFoundError(error)) {
          toast.error(t('rawMaterials.catalog.toasts.bindingInvalid'))
          return
        }
        toast.error(
          error instanceof Error
            ? error.message
            : t('rawMaterials.catalog.toasts.bindingLookupFailed')
        )
        return
      }
    },
    [openEdit, specs, t]
  )

  const submitBindingTokenInput = useCallback(
    (value: string) => {
      void consumeBindingToken(value)
    },
    [consumeBindingToken]
  )

  useEffect(() => {
    const bindToken = search.bindToken ?? ''
    if (!bindToken) return
    const timeoutId = window.setTimeout(() => {
      void consumeBindingToken(bindToken)
    }, 0)
    void navigate({
      to: '/raw-materials/catalog',
      search: { bindToken: '' },
      replace: true,
    })
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [consumeBindingToken, navigate, search.bindToken])

  const handleSave = useCallback(() => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error(t('rawMaterials.catalog.toasts.requiredCodeAndName'))
      return
    }
    savePrepregSpec(buildPrepregSpecPayload(form, editingSpec))
  }, [editingSpec, form, savePrepregSpec, t])

  return {
    searchTerm,
    setSearchTerm,
    specs,
    isLoading,
    dialogOpen,
    setDialogOpen: setDialogOpenSafely,
    editingSpec,
    form,
    updateForm,
    supplierOptions,
    supplierSelectValue,
    isSupplierLoading,
    onSupplierChange,
    cleanedDimensions,
    cleanedResinBatch,
    openCreate,
    openEdit,
    bindingTokenDialogOpen,
    setBindingTokenDialogOpen,
    submitBindingTokenInput,
    activeBindingToken,
    applyRecognizedFields,
    handleSave,
    isSaving,
  }
}
