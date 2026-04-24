import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<PrepregMaterialSpec | null>(null)
  const [form, setForm] = useState<PrepregFormState>(EMPTY_PREPREG_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', 'prepreg-specs', searchTerm],
    queryFn: () => PrepregMaterialSpecService.list(searchTerm, 1, 200),
  })
  const { data: suppliers = [], isLoading: isSupplierLoading } = useGetSuppliers({
    enabled: dialogOpen,
  })

  const specs = data?.items ?? []
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.status === 'Active'),
    [suppliers]
  )

  const { mutate: savePrepregSpec, isPending: isSaving } = useMutation({
    mutationFn: (payload: Partial<PrepregMaterialSpec>) =>
      PrepregMaterialSpecService.save(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['raw-materials', 'prepreg-specs'],
      })
      toast.success(
        editingSpec
          ? t('rawMaterials.catalog.toasts.updated')
          : t('rawMaterials.catalog.toasts.created')
      )
      setDialogOpen(false)
      setEditingSpec(null)
      setForm(EMPTY_PREPREG_FORM)
    },
  })

  const openCreate = useCallback(() => {
    setEditingSpec(null)
    setForm(EMPTY_PREPREG_FORM)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((spec: PrepregMaterialSpec) => {
    setEditingSpec(spec)
    setForm(formFromPrepregSpec(spec))
    setDialogOpen(true)
  }, [])

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
    setDialogOpen,
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
    applyRecognizedFields,
    handleSave,
    isSaving,
  }
}
