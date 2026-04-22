'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { type Unit } from '@/features/basic-settings/services/unit-service'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { type Product } from '@/features/engineering/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import {
  packagingRulesService,
  type PackagingProfile,
  type PackagingProfileTarget,
  type SavePackagingProfileInput,
} from './packaging-rules-service'

type PackagingProfileDraft = SavePackagingProfileInput

const PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const
const EMPTY_PACKAGING_MATERIAL_OPTIONS: MaterialOption[] = []
const packagingFieldClass = 'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30 disabled:opacity-100 disabled:bg-muted/20 disabled:text-foreground/70'
const packagingSelectClass = `${packagingFieldClass} justify-between data-[size=default]:h-11`
const packagingLabelClass = 'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'
const packagingSectionClass = 'rounded-[28px] border border-dashed border-border/60 bg-muted/[0.035] p-4 md:p-5'
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

  return (PACKAGING_UNIT_CODE_FALLBACKS[kind] as readonly string[]).includes(normalizePackagingUnitCode(unit.code))
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

  return units.find((unit) => normalizePackagingUnitCode(unit.code) === normalizedCode)?.code ?? unitCode.trim()
}

function buildPackagingUnitCandidates(units: Unit[], kind: PackagingUnitKind, selectedCode: string): Unit[] {
  const matchedUnits = units.filter((unit) => unit.status === 'active' && matchesPackagingUnitKind(unit, kind))
  const selectedUnit = units.find((unit) => normalizePackagingUnitCode(unit.code) === normalizePackagingUnitCode(selectedCode))

  if (!selectedUnit) {
    return dedupePackagingUnits(matchedUnits)
  }

  return dedupePackagingUnits([
    selectedUnit,
    ...matchedUnits,
  ])
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

function createDefaultTarget(): PackagingProfileTarget {
  return {
    entityType: 'product',
    entityId: '',
    entityCode: '',
    entityName: '',
    spec: '',
    isDefault: true,
    sortOrder: 0,
  }
}

function createEmptyDraft(): PackagingProfileDraft {
  return {
    code: '',
    name: '',
    packagingType: 'carton',
    length: 0,
    width: 0,
    height: 0,
    dimensionUnitCode: '',
    netWeight: 0,
    grossWeight: 0,
    weightUnitCode: '',
    capacity: 1,
    capacityUnitCode: 'pcs',
    assemblySource: '',
    isActive: true,
    notes: '',
    targets: [createDefaultTarget()],
  }
}

export function LogisticsPackagingRulesTab() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PackagingProfileDraft>(createEmptyDraft())

  const profilesQuery = useQuery({
    queryKey: PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
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
      queryClient.setQueryData<PackagingProfile[]>(PACKAGING_PROFILE_QUERY_KEY, (current) => {
        if (!current) return [saved]
        return current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => packagingRulesService.deleteProfile(id),
    onSuccess: (_result, deletedId) => {
      queryClient.setQueryData<PackagingProfile[]>(PACKAGING_PROFILE_QUERY_KEY, (current) =>
        current?.filter((item) => item.id !== deletedId)
      )
    },
  })

  const isLoading = profilesQuery.isLoading || productsQuery.isLoading || isUnitsLoading

  if (profilesQuery.isError) {
    failLoudly(profilesQuery.error, 'LogisticsPackagingRulesTab.profiles')
    throw profilesQuery.error
  }
  if (productsQuery.isError) {
    failLoudly(productsQuery.error, 'LogisticsPackagingRulesTab.products')
    throw productsQuery.error
  }
  if (packagingMaterialsQuery.isError) {
    failLoudly(packagingMaterialsQuery.error, 'LogisticsPackagingRulesTab.packagingMaterials')
    throw packagingMaterialsQuery.error
  }
  if (unitsError) {
    failLoudly(unitsError, 'LogisticsPackagingRulesTab.units')
    throw unitsError
  }
  if (!isLoading && !profilesQuery.data) {
    const error = new Error('[CRITICAL] Missing packaging profiles payload')
    failLoudly(error, 'LogisticsPackagingRulesTab.profiles')
    throw error
  }
  if (!packagingMaterialsQuery.isLoading && !packagingMaterialsQuery.data) {
    const error = new Error('[CRITICAL] Missing packaging material options payload')
    failLoudly(error, 'LogisticsPackagingRulesTab.packagingMaterials')
    throw error
  }

  const profiles = profilesQuery.data ?? []
  const products = productsQuery.data ?? []
  const packagingMaterials = packagingMaterialsQuery.data ?? EMPTY_PACKAGING_MATERIAL_OPTIONS

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

  const selectedTarget = draft.targets[0] ?? createDefaultTarget()
  const selectedProduct = products.find((item) => item.id === selectedTarget.entityId) ?? null
  const selectedPackagingMaterialId = useMemo(
    () => packagingMaterials.find((material) => material.category === 'PACKAGING' && material.name === draft.name)?.id ?? '',
    [draft.name, packagingMaterials]
  )
  const computedVolume = draft.length * draft.width * draft.height
  const computedGrossWeight = draft.netWeight + (selectedProduct?.weight ?? 0) * draft.capacity

  const handleCreate = () => {
    setDraft(createEmptyDraft())
    setOpen(true)
  }

  const handleEdit = (profile: PackagingProfile) => {
    setDraft({
      id: profile.id,
      code: profile.code,
      name: profile.name,
      packagingType: profile.packagingType,
      length: profile.length,
      width: profile.width,
      height: profile.height,
      dimensionUnitCode: profile.dimensionUnitCode,
      netWeight: profile.netWeight,
      grossWeight: profile.grossWeight,
      weightUnitCode: profile.weightUnitCode,
      capacity: profile.capacity,
      capacityUnitCode: profile.capacityUnitCode,
      assemblySource: '',
      isActive: profile.isActive,
      notes: profile.notes ?? '',
      targets: profile.targets.length > 0 ? [profile.targets[0]] : [createDefaultTarget()],
    })
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('logisticsConfig.packagingRules.deleteConfirm'))) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(t('logisticsConfig.packagingRules.toasts.deleteSuccess'))
    } catch (error) {
      failLoudly(error, 'LogisticsPackagingRulesTab.delete')
      toast.error(t('logisticsConfig.packagingRules.toasts.deleteFailed'))
    }
  }

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
    const material = packagingMaterials.find((item) => item.id === materialId && item.category === 'PACKAGING')
    setDraft((current) => ({
      ...current,
      name: material?.name ?? '',
    }))
  }

  const handleSave = async () => {
    if (!draft.name.trim() || !selectedTarget.entityId || !draft.dimensionUnitCode || !draft.weightUnitCode) {
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
        capacityUnitCode: resolvedCapacityUnitCode || quantityUnits[0]?.code || draft.capacityUnitCode,
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
      setDraft(createEmptyDraft())
    } catch (error) {
      failLoudly(error, 'LogisticsPackagingRulesTab.save')
      toast.error(t('logisticsConfig.packagingRules.toasts.saveFailed'))
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Package2}
        title={t('logisticsConfig.packagingRules.title')}
        description={t('logisticsConfig.packagingRules.description')}
      />

      <div className='flex justify-end'>
        <Button 
          className='h-11 rounded-full font-black text-[10px] uppercase tracking-widest px-6 shadow-lg hover:shadow-xl transition-all duration-300' 
          onClick={handleCreate}
        >
          <Plus className='mr-2 size-4' />
          {t('logisticsConfig.packagingRules.addRule')}
        </Button>
      </div>

      <div className='rounded-[24px] border border-dashed bg-muted/5 p-4 md:p-6 overflow-hidden transition-all duration-500 hover:border-primary/20'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-dashed'>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.name')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.product')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.quantity')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.size')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.volume')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.weight')}</TableHead>
              <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.status')}</TableHead>
              <TableHead className='text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-28 text-center text-muted-foreground'>
                  {isLoading
                    ? t('logisticsConfig.packagingRules.emptyLoading')
                    : t('logisticsConfig.packagingRules.emptyState')}
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id} className='border-dashed hover:bg-muted/5 transition-colors'>
                  <TableCell className='font-black italic text-sm tracking-tight text-primary transition-all group-hover:pl-4'>
                    {profile.name}
                  </TableCell>
                  <TableCell className='font-medium text-xs opacity-80'>{profile.targets[0]?.entityName || '-'}</TableCell>
                  <TableCell className='font-mono text-[10px] font-bold'>
                    {profile.capacity} {profile.capacityUnitCode}
                  </TableCell>
                  <TableCell className='font-mono text-[10px]'>
                    {profile.length} × {profile.width} × {profile.height} <span className='opacity-50'>{profile.dimensionUnitCode}</span>
                  </TableCell>
                  <TableCell className='font-bold text-[10px] tracking-tighter'>
                    {profile.length * profile.width * profile.height} <span className='opacity-50'>{profile.dimensionUnitCode}³</span>
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col gap-0.5'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-black uppercase tracking-widest opacity-40 leading-none'>{t('logisticsConfig.packagingRules.packagingWeightLabel')}</span>
                        <span className='font-mono text-[10px] font-bold leading-none'>{profile.netWeight} {profile.weightUnitCode}</span>
                      </div>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-[8px] font-black uppercase tracking-widest opacity-40 leading-none'>{t('logisticsConfig.packagingRules.grossWeightLabel')}</span>
                        <span className='font-mono text-[10px] font-bold leading-none text-primary'>{profile.grossWeight} {profile.weightUnitCode}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={profile.isActive ? 'default' : 'secondary'}
                      className={cn(
                        'h-5 rounded-full px-2 text-[8px] font-mono uppercase tracking-tighter border-none',
                        profile.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      )}
                    >
                      {profile.isActive
                        ? t('logisticsConfig.packagingRules.statusActive')
                        : t('logisticsConfig.packagingRules.statusInactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button 
                        variant='ghost' 
                        size='sm' 
                        className='h-7 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-colors'
                        onClick={() => handleEdit(profile)}
                      >
                        {t('logisticsConfig.packagingRules.edit')}
                      </Button>
                      <Button 
                        variant='ghost' 
                        size='sm' 
                        className='h-7 w-7 p-0 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors'
                        onClick={() => handleDelete(profile.id)}
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex max-h-[92vh] w-[min(1360px,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />
          
          <div className='relative flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-6 space-y-5'>
            <DialogHeader className='space-y-1 mt-2'>
              <DialogTitle className='text-xl font-black italic uppercase tracking-tighter text-primary'>
                {t('logisticsConfig.packagingRules.dialog.title')}
              </DialogTitle>
              <DialogDescription className='text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none'>
                {t('logisticsConfig.packagingRules.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4'>
              <section className={packagingSectionClass}>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                      Packaging Identity
                    </p>
                    <h3 className='mt-1 text-sm font-black uppercase tracking-tight text-foreground'>
                      基础信息
                    </h3>
                  </div>
                  <Badge variant='outline' className='rounded-full border-primary/15 bg-primary/5 px-3 text-[9px] font-black uppercase tracking-widest text-primary'>
                    01
                  </Badge>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.packagingName')}</Label>
                    <Combobox
                      options={packagingMaterialOptions}
                      value={selectedPackagingMaterialId}
                      onValueChange={updateSelectedPackagingMaterial}
                      placeholder={draft.name || '请选择包装物料'}
                      searchPlaceholder='搜索包装物料名称、规格或编码...'
                      emptyText='未找到包装物料'
                      isLoading={packagingMaterialsQuery.isLoading}
                      variant='industrial'
                      className='h-11! rounded-2xl! border! border-border/50! bg-muted/40! px-4! text-sm! font-medium! shadow-sm! shadow-black/5!'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.product')}</Label>
                    <Select value={selectedTarget.entityId} onValueChange={updateSelectedProduct}>
                      <SelectTrigger className={packagingSelectClass}>
                        <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.product')} />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-xl'>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id} className='m-1 rounded-lg'>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.status')}</Label>
                    <Select value={draft.isActive ? 'active' : 'inactive'} onValueChange={(value) => setDraft((current) => ({ ...current, isActive: value === 'active' }))}>
                      <SelectTrigger className={packagingSelectClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-xl'>
                        <SelectItem value='active' className='m-1 rounded-lg'>{t('logisticsConfig.packagingRules.statusActive')}</SelectItem>
                        <SelectItem value='inactive' className='m-1 rounded-lg'>{t('logisticsConfig.packagingRules.statusInactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.dimensionUnit')}</Label>
                    <Select value={resolvedDimensionUnitCode} onValueChange={(value) => setDraft((current) => ({ ...current, dimensionUnitCode: value }))}>
                      <SelectTrigger className={packagingSelectClass}>
                        <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.dimensionUnit')} />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-xl'>
                        {dimensionUnits.length === 0 ? (
                          <div className='px-3 py-2 text-sm text-muted-foreground'>未找到长度单位，请先到单位管理维护长度单位</div>
                        ) : (
                          dimensionUnits.map((unit) => (
                            <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                              {unit.name} ({unit.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.weightUnit')}</Label>
                    <Select value={resolvedWeightUnitCode} onValueChange={(value) => setDraft((current) => ({ ...current, weightUnitCode: value }))}>
                      <SelectTrigger className={packagingSelectClass}>
                        <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.weightUnit')} />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-xl'>
                        {weightUnits.length === 0 ? (
                          <div className='px-3 py-2 text-sm text-muted-foreground'>未找到重量单位，请先到单位管理维护重量单位</div>
                        ) : (
                          weightUnits.map((unit) => (
                            <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                              {unit.name} ({unit.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.quantityUnit')}</Label>
                    <Select value={resolvedCapacityUnitCode} onValueChange={(value) => setDraft((current) => ({ ...current, capacityUnitCode: value }))}>
                      <SelectTrigger className={packagingSelectClass}>
                        <SelectValue placeholder={t('logisticsConfig.packagingRules.placeholders.capacityUnit')} />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-xl'>
                        {quantityUnits.length === 0 ? (
                          <div className='px-3 py-2 text-sm text-muted-foreground'>未找到数量单位，请先到单位管理维护数量单位</div>
                        ) : (
                          quantityUnits.map((unit) => (
                            <SelectItem key={unit.code} value={unit.code} className='m-1 rounded-lg'>
                              {unit.name} ({unit.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.productWeight')}</Label>
                    <Input className={cn(packagingFieldClass, 'font-mono')} value={selectedProduct?.weight ?? 0} disabled />
                  </div>
                </div>
              </section>

              <section className={packagingSectionClass}>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                      Packaging Metrics
                    </p>
                    <h3 className='mt-1 text-sm font-black uppercase tracking-tight text-foreground'>
                      尺寸与装箱
                    </h3>
                  </div>
                  <Badge variant='outline' className='rounded-full border-primary/15 bg-background/80 px-3 text-[9px] font-black uppercase tracking-widest text-primary'>
                    02
                  </Badge>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.length')}</Label>
                    <Input
                      type='number'
                      className={cn(packagingFieldClass, 'font-mono')}
                      value={draft.length}
                      onChange={(event) => setDraft((current) => ({ ...current, length: Number(event.target.value) || 0 }))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.width')}</Label>
                    <Input
                      type='number'
                      className={cn(packagingFieldClass, 'font-mono')}
                      value={draft.width}
                      onChange={(event) => setDraft((current) => ({ ...current, width: Number(event.target.value) || 0 }))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.height')}</Label>
                    <Input
                      type='number'
                      className={cn(packagingFieldClass, 'font-mono')}
                      value={draft.height}
                      onChange={(event) => setDraft((current) => ({ ...current, height: Number(event.target.value) || 0 }))}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.quantity')}</Label>
                    <Input
                      type='number'
                      className={cn(packagingFieldClass, 'font-mono')}
                      value={draft.capacity}
                      onChange={(event) => setDraft((current) => ({ ...current, capacity: Number(event.target.value) || 0, grossWeight: current.netWeight + (selectedProduct?.weight ?? 0) * (Number(event.target.value) || 0) }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className='grid grid-cols-1 gap-3 rounded-[24px] border border-dashed bg-primary/5 p-4 md:grid-cols-3'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.volume')}</div>
                <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{computedVolume} <span className='text-[10px] not-italic opacity-50'>{draft.dimensionUnitCode || '-'}³</span></div>
              </div>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.productWeightTotal')}</div>
                <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{(selectedProduct?.weight ?? 0) * draft.capacity} <span className='text-[10px] not-italic opacity-50'>{draft.weightUnitCode || '-'}</span></div>
              </div>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('logisticsConfig.packagingRules.summary.grossWeight')}</div>
                <div className='mt-1 text-xl font-black italic tracking-tighter text-primary'>{computedGrossWeight} <span className='text-[10px] not-italic opacity-50'>{draft.weightUnitCode || '-'}</span></div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className={packagingLabelClass}>{t('logisticsConfig.packagingRules.fields.notes')}</Label>
              <Textarea 
                className='min-h-[72px] rounded-2xl border border-border/50 bg-muted/40 px-4 py-2.5 text-sm shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30 resize-none'
                value={draft.notes ?? ''} 
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} 
                rows={2} 
              />
            </div>

            <DialogFooter className='pt-2'>
              <Button 
                variant='ghost' 
                className='h-11 px-8 text-[10px] font-black uppercase tracking-widest'
                onClick={() => setOpen(false)}
              >
                {t('logisticsConfig.packagingRules.cancel')}
              </Button>
              <Button 
                className='h-11 px-8 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95'
                onClick={handleSave} 
                disabled={saveMutation.isPending}
              >
                {t('logisticsConfig.packagingRules.save')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
