import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { type SavePackagingRuleInput } from '../adapters/packaging-api-adapter'
import { type MaterialOption, type PackagingRule } from '../data/schema'
import { useMaterialAssemblyData } from './use-material-assembly-data'
import { PACKAGING_RULES_QUERY_KEY } from '../query-keys'
import { packagingService } from '../services/packaging-service'
import {
  applySelectedMaterialToPackagingRuleDraft,
  buildPackagingRuleRelation,
  createEmptyPackagingRuleDraft,
  parsePackagingRuleFactor,
  type PackagingRuleDraft,
  toPackagingRuleDraft,
  toSavePackagingRuleInput,
  togglePackagingRuleDirection,
  updatePackagingRuleDraftField,
} from '../utils/packaging-rule-draft'

export interface MaterialAssemblyRow {
  id: string
  rule: PackagingRule
  materialCode: string
  materialName: string
  baseUnit: string
  packUnit: string
  conversionFactor: number
  direction: PackagingRule['direction']
  relation: string
}

function requireMaterialOption(
  materialMap: Map<string, MaterialOption>,
  materialId: string,
  scope: string
) {
  const material = materialMap.get(materialId)
  if (!material) {
    const error = new Error(`[CRITICAL] Missing material ${materialId} in ${scope}`)
    failLoudly(error, `useMaterialAssemblyManager.${scope}`)
    throw error
  }
  return material
}

function mergePackagingRulesCache(
  current: PackagingRule[] | undefined,
  savedRule: PackagingRule
) {
  if (!current) return [savedRule]

  return current.some((rule) => rule.id === savedRule.id)
    ? current.map((rule) => (rule.id === savedRule.id ? savedRule : rule))
    : [...current, savedRule]
}

function removePackagingRuleFromCache(
  current: PackagingRule[] | undefined,
  deletedId: string
) {
  return current?.filter((rule) => rule.id !== deletedId)
}

/** Orchestrates state, caching, and interaction flow for the material assembly manager. */
export function useMaterialAssemblyManager() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PackagingRuleDraft | null>(null)
  const assemblyData = useMaterialAssemblyData()

  const saveRuleMutation = useMutation({
    mutationFn: (rule: SavePackagingRuleInput) => packagingService.saveRule(rule),
    onSuccess: (savedRule) => {
      queryClient.setQueryData<PackagingRule[]>(PACKAGING_RULES_QUERY_KEY, (current) =>
        mergePackagingRulesCache(current, savedRule)
      )
    },
  })

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => packagingService.deleteRule(id),
    onSuccess: (_result, deletedId) => {
      queryClient.setQueryData<PackagingRule[]>(PACKAGING_RULES_QUERY_KEY, (current) =>
        removePackagingRuleFromCache(current, deletedId)
      )
    },
  })

  const { mutateAsync: saveRule, isPending: isSaving } = saveRuleMutation
  const { mutateAsync: deleteRule } = deleteRuleMutation

  const isLoading = assemblyData.isLoading
  const rules = assemblyData.rules
  const materials = assemblyData.materials

  const materialMap = useMemo(() => {
    const map = new Map<string, MaterialOption>()
    materials.forEach((material) => map.set(material.id, material))
    return map
  }, [materials])

  const rows = useMemo<MaterialAssemblyRow[]>(() => {
    return rules.map((rule) => {
      const material = requireMaterialOption(materialMap, rule.materialId, 'buildRow')

      return {
        id: rule.id,
        rule,
        materialCode: material.code,
        materialName: material.name,
        baseUnit: material.uom,
        packUnit: rule.packUnit,
        conversionFactor: rule.conversionFactor,
        direction: rule.direction,
        relation: buildPackagingRuleRelation({
          baseUnit: material.uom,
          packUnit: rule.packUnit,
          conversionFactor: rule.conversionFactor,
          direction: rule.direction,
        }),
      }
    })
  }, [materialMap, rules])

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) return rows

    return rows.filter((row) => {
      return (
        row.materialName.toLowerCase().includes(search) ||
        row.materialCode.toLowerCase().includes(search)
      )
    })
  }, [rows, searchTerm])

  const selectedMaterial = useMemo(() => {
    if (!editingRule?.materialId || isLoading) return null
    return requireMaterialOption(materialMap, editingRule.materialId, 'selectedMaterial')
  }, [editingRule, isLoading, materialMap])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingRule(null)
      setIsComboboxOpen(false)
    }
  }, [])

  const handleOpenCreate = useCallback(() => {
    setEditingRule(createEmptyPackagingRuleDraft())
    setIsDialogOpen(true)
    setIsComboboxOpen(false)
  }, [])

  const handleOpenEdit = useCallback((rule: PackagingRule, baseUnit: string) => {
    setEditingRule(toPackagingRuleDraft(rule, baseUnit))
    setIsDialogOpen(true)
    setIsComboboxOpen(false)
  }, [])

  const handleSelectMaterial = useCallback((material: MaterialOption) => {
    setEditingRule((current) => applySelectedMaterialToPackagingRuleDraft(current, material))
    setIsComboboxOpen(false)
  }, [])

  const handleDraftFieldChange = useCallback(<K extends keyof SavePackagingRuleInput>(
    field: K,
    value: SavePackagingRuleInput[K]
  ) => {
    setEditingRule((current) => updatePackagingRuleDraftField(current, field, value))
  }, [])

  const handleFactorChange = useCallback((rawValue: string) => {
    setEditingRule((current) =>
      updatePackagingRuleDraftField(current, 'conversionFactor', parsePackagingRuleFactor(rawValue))
    )
  }, [])

  const handleToggleDirection = useCallback(() => {
    setEditingRule((current) => togglePackagingRuleDirection(current))
  }, [])

  const handleSave = useCallback(async () => {
    const ruleToSave = toSavePackagingRuleInput(editingRule)

    if (!ruleToSave) {
      toast.error(t('materialArchive.assemblyManager.toasts.incomplete'))
      return
    }

    try {
      await saveRule(ruleToSave)
      toast.success(t('materialArchive.assemblyManager.toasts.saveSuccess'))
      handleDialogOpenChange(false)
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'PACKAGING_RULE_DUPLICATE_MATERIAL'
      ) {
        toast.error(t('materialArchive.assemblyManager.toasts.duplicateMaterial'))
        return
      }

      if (isConflictError(error)) {
        toast.error(t('materialArchive.assemblyManager.toasts.conflict'))
        return
      }

      toast.error(t('materialArchive.assemblyManager.toasts.saveFailed'))
    }
  }, [editingRule, handleDialogOpenChange, saveRule, t])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(t('materialArchive.assemblyManager.toasts.deleteConfirm'))) return

    try {
      await deleteRule(id)
      toast.success(t('materialArchive.assemblyManager.toasts.deleteSuccess'))
    } catch (error) {
      failLoudly(error, 'useMaterialAssemblyManager.handleDelete')
    }
  }, [deleteRule, t])

  return {
    searchTerm,
    setSearchTerm,
    isDialogOpen,
    isComboboxOpen,
    setIsComboboxOpen,
    editingRule,
    selectedMaterial,
    materialOptions: materials,
    isLoading,
    filteredRows,
    handleDialogOpenChange,
    handleOpenCreate,
    handleOpenEdit,
    handleSelectMaterial,
    handleDraftFieldChange,
    handleFactorChange,
    handleToggleDirection,
    handleSave,
    handleDelete,
    isSaving,
  }
}
