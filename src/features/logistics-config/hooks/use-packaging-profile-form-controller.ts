import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { type Product } from '@/features/engineering/data/schema'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import {
  createDefaultPackagingProfileTarget,
  createEmptyPackagingProfileDraft,
  mapPackagingProfileToDraft,
  type PackagingProfileDraft,
} from '../packaging-profile-form'
import {
  packagingRulesService,
  type PackagingProfile,
  type SavePackagingProfileInput,
} from '../packaging-rules-service'

const PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const
const EMPTY_PACKAGING_MATERIAL_OPTIONS: MaterialOption[] = []
const PACKAGING_UNIT_CODE_FALLBACKS = {
  LENGTH: ['mm', 'cm', 'm', 'meter', 'metre', 'km', 'in', 'inch', 'ft', 'foot'],
  WEIGHT: ['mg', 'g', 'gram', 'kg', 'kilogram', 't', 'ton', 'lb', 'lbs', 'oz'],
  QUANTITY: ['pcs', 'pc', 'piece', 'pieces', 'ea', 'unit', 'units', 'set', 'sets', 'box', 'boxes', 'ctn', 'carton', 'cartons', 'pack', 'pkg'],
} as const

type PackagingUnitKind = keyof typeof PACKAGING_UNIT_CODE_FALLBACKS

function normalizePackagingUnitCode(value: string): string {
  return value.trim().toLowerCase()
}

function matchesPackagingUnitKind(unit: Unit, kind: PackagingUnitKind): boolean {
  if (unit.category === kind) {
    return true
  }

  return (PACKAGING_UNIT_CODE_FALLBACKS[kind] as readonly string[]).includes(
    normalizePackagingUnitCode(unit.code)
  )
}

function dedupePackagingUnits(units: Unit[]): Unit[] {
  const seen = new Set<string>()
  const result: Unit[] = []

  for (const unit of units) {
    const normalizedCode = normalizePackagingUnitCode(unit.code)
    if (normalizedCode === '' || seen.has(normalizedCode)) {
      continue
    }
    seen.add(normalizedCode)
    result.push(unit)
  }

  return result
}

function resolvePackagingUnitCode(units: Unit[], unitCode: string): string {
  const normalizedCode = normalizePackagingUnitCode(unitCode)
  if (normalizedCode === '') {
    return ''
  }

  return (
    units.find((unit) => normalizePackagingUnitCode(unit.code) === normalizedCode)
      ?.code ?? unitCode.trim()
  )
}

function buildPackagingUnitCandidates(
  units: Unit[],
  kind: PackagingUnitKind,
  selectedCode: string
): Unit[] {
  const matchedUnits = units.filter(
    (unit) => unit.status === 'active' && matchesPackagingUnitKind(unit, kind)
  )
  const selectedUnit = units.find(
    (unit) =>
      normalizePackagingUnitCode(unit.code) ===
      normalizePackagingUnitCode(selectedCode)
  )

  if (!selectedUnit) {
    return dedupePackagingUnits(matchedUnits)
  }

  return dedupePackagingUnits([selectedUnit, ...matchedUnits])
}

function createPackagingProfileCode(name: string): string {
  const normalized = name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '')
    .slice(0, 16)
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  return `PKG-${normalized || 'BOX'}-${stamp}`
}

interface UsePackagingProfileFormControllerOptions {
  initialProductId?: string
  initialProfile?: PackagingProfile
  onSaveSuccess?: (saved: PackagingProfile) => void
}

export function usePackagingProfileFormController({
  initialProductId,
  initialProfile,
  onSaveSuccess,
}: UsePackagingProfileFormControllerOptions = {}) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PackagingProfileDraft>(() => {
    const baseDraft = initialProfile
      ? mapPackagingProfileToDraft(initialProfile)
      : createEmptyPackagingProfileDraft()

    if (!initialProductId || initialProfile) {
      return baseDraft
    }

    return {
      ...baseDraft,
      targets: [
        {
          ...createDefaultPackagingProfileTarget(),
          entityId: initialProductId,
        },
      ],
    }
  })

  const productsQuery = useQuery({
    queryKey: ['engineering', 'products', 'options'],
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }) as Promise<Product[]>,
  })
  const packagingMaterialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions() as Promise<MaterialOption[]>,
  })
  const { units, isLoading: isUnitsLoading, error: unitsError } = useUnitsQuery()

  const saveMutation = useMutation({
    mutationFn: (payload: SavePackagingProfileInput) => packagingRulesService.saveProfile(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData<PackagingProfile[]>(
        PACKAGING_PROFILE_QUERY_KEY,
        (current) => {
          if (!current) return [saved]
          return current.some((item) => item.id === saved.id)
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...current]
        }
      )
      onSaveSuccess?.(saved)
    },
  })

  const products = productsQuery.data ?? []
  const packagingMaterials =
    packagingMaterialsQuery.data ?? EMPTY_PACKAGING_MATERIAL_OPTIONS
  const selectedTarget = draft.targets[0] ?? createDefaultPackagingProfileTarget()
  const selectedProduct =
    products.find((item) => item.id === selectedTarget.entityId) ?? null

  const resolvedDimensionUnitCode = useMemo(
    () => resolvePackagingUnitCode(units, draft.dimensionUnitCode),
    [units, draft.dimensionUnitCode]
  )
  const resolvedWeightUnitCode = useMemo(
    () => resolvePackagingUnitCode(units, draft.weightUnitCode),
    [units, draft.weightUnitCode]
  )
  const resolvedCapacityUnitCode = useMemo(
    () => resolvePackagingUnitCode(units, draft.capacityUnitCode),
    [units, draft.capacityUnitCode]
  )
  const dimensionUnits = useMemo(
    () => buildPackagingUnitCandidates(units, 'LENGTH', draft.dimensionUnitCode),
    [units, draft.dimensionUnitCode]
  )
  const weightUnits = useMemo(
    () => buildPackagingUnitCandidates(units, 'WEIGHT', draft.weightUnitCode),
    [units, draft.weightUnitCode]
  )
  const quantityUnits = useMemo(
    () => buildPackagingUnitCandidates(units, 'QUANTITY', draft.capacityUnitCode),
    [units, draft.capacityUnitCode]
  )
  const packagingMaterialOptions = useMemo(
    () =>
      packagingMaterials
        .filter((material) => material.category === 'PACKAGING')
        .map((material) => ({
          value: material.id,
          label: material.name,
          keywords: `${material.code} ${material.spec ?? ''}`,
          secondaryLabel: material.spec ?? '',
          tertiaryLabel: material.code,
        })),
    [packagingMaterials]
  )
  const selectedPackagingMaterialId = useMemo(
    () =>
      packagingMaterials.find(
        (material) =>
          material.category === 'PACKAGING' && material.name === draft.name
      )?.id ?? '',
    [draft.name, packagingMaterials]
  )
  const computedVolume = draft.length * draft.width * draft.height
  const computedGrossWeight =
    draft.netWeight + (selectedProduct?.weight ?? 0) * draft.capacity

  const updateSelectedProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    setDraft((current) => ({
      ...current,
      targets: [
        {
          id: current.targets[0]?.id,
          packagingProfileId: current.targets[0]?.packagingProfileId,
          entityType: 'product',
          entityId: productId,
          entityCode: product?.sku ?? '',
          entityName: product?.name ?? '',
          spec: product?.description ?? '',
          isDefault: true,
          sortOrder: 0,
        },
      ],
      grossWeight: current.netWeight + (product?.weight ?? 0) * current.capacity,
    }))
  }

  const updateSelectedPackagingMaterial = (materialId: string) => {
    const material = packagingMaterials.find(
      (item) => item.id === materialId && item.category === 'PACKAGING'
    )
    setDraft((current) => ({
      ...current,
      name: material?.name ?? '',
    }))
  }

  const handleCreate = (productId?: string) => {
    const nextDraft = createEmptyPackagingProfileDraft()
    if (!productId) {
      setDraft(nextDraft)
      setOpen(true)
      return
    }

    setDraft({
      ...nextDraft,
      targets: [
        {
          ...createDefaultPackagingProfileTarget(),
          entityId: productId,
        },
      ],
    })
    setOpen(true)
  }

  const handleEdit = (profile: PackagingProfile) => {
    setDraft(mapPackagingProfileToDraft(profile))
    setOpen(true)
  }

  const handleSave = async () => {
    if (
      !draft.name.trim() ||
      !selectedTarget.entityId ||
      !draft.dimensionUnitCode ||
      !draft.weightUnitCode
    ) {
      toast.error(t('logisticsConfig.packagingRules.toasts.incomplete'))
      return
    }

    try {
      const payload: SavePackagingProfileInput = {
        ...draft,
        code: draft.id ? draft.code : createPackagingProfileCode(draft.name),
        packagingType: 'carton',
        assemblySource: '',
        dimensionUnitCode: resolvedDimensionUnitCode,
        weightUnitCode: resolvedWeightUnitCode,
        capacityUnitCode:
          resolvedCapacityUnitCode || quantityUnits[0]?.code || draft.capacityUnitCode,
        grossWeight: computedGrossWeight,
        targets: [
          {
            ...selectedTarget,
            entityType: 'product',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      }
      await saveMutation.mutateAsync(payload)
      toast.success(t('logisticsConfig.packagingRules.toasts.saveSuccess'))
      setOpen(false)
      setDraft(createEmptyPackagingProfileDraft())
    } catch (error) {
      failLoudly(error, 'usePackagingProfileFormController.save')
      toast.error(t('logisticsConfig.packagingRules.toasts.saveFailed'))
    }
  }

  if (productsQuery.isError) {
    failLoudly(productsQuery.error, 'usePackagingProfileFormController.products')
    throw productsQuery.error
  }
  if (packagingMaterialsQuery.isError) {
    failLoudly(
      packagingMaterialsQuery.error,
      'usePackagingProfileFormController.packagingMaterials'
    )
    throw packagingMaterialsQuery.error
  }
  if (unitsError) {
    failLoudly(unitsError, 'usePackagingProfileFormController.units')
    throw unitsError
  }

  return {
    open,
    setOpen,
    draft,
    setDraft,
    products,
    packagingMaterials,
    packagingMaterialOptions,
    dimensionUnits,
    weightUnits,
    quantityUnits,
    resolvedDimensionUnitCode,
    resolvedWeightUnitCode,
    resolvedCapacityUnitCode,
    selectedPackagingMaterialId,
    selectedProduct,
    computedVolume,
    computedGrossWeight,
    packagingMaterialsLoading: packagingMaterialsQuery.isLoading,
    savePending: saveMutation.isPending,
    handleCreate,
    handleEdit,
    handleSave,
    updateSelectedPackagingMaterial,
    updateSelectedProduct,
    isLoading: productsQuery.isLoading || packagingMaterialsQuery.isLoading || isUnitsLoading,
  }
}
