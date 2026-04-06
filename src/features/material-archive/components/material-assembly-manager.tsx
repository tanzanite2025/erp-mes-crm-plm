'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowRightLeft,
  Check,
  ChevronsUpDown,
  Plus,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { DataTablePagination } from '@/components/data-table/pagination'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { isConflictError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { failLoudly } from '@/lib/safe-catch'
import { type Material, type PackagingRule } from '../data/schema'
import { materialService } from '../services/material-service'
import { packagingService } from '../services/packaging-service'

function buildRelation(rule: Partial<PackagingRule> | null) {
  const factor = rule?.conversionFactor ?? '?'
  const packUnit = rule?.packUnit || '?'
  const baseUnit = rule?.baseUnit || '?'

  return rule?.direction === 'reverse'
    ? `1 ${baseUnit} = ${factor} ${packUnit}`
    : `1 ${packUnit} = ${factor} ${baseUnit}`
}

export function MaterialAssemblyManager() {
  const { t } = useLanguage()
  const [rules, setRules] = useState<PackagingRule[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Partial<PackagingRule> | null>(null)

  const materialMap = useMemo(() => {
    const map = new Map<string, Material>()
    materials.forEach((material) => map.set(material.id, material))
    return map
  }, [materials])

  const filteredRules = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return rules.filter((rule) => {
      const material = materialMap.get(rule.materialId)
      if (!material) return false
      if (!search) return true
      return material.name.toLowerCase().includes(search) || material.code.toLowerCase().includes(search)
    })
  }, [materialMap, rules, searchTerm])

  const availableMaterials = useMemo(() => {
    const existingMaterialIds = new Set(
      rules.filter((rule) => rule.id !== editingRule?.id).map((rule) => rule.materialId)
    )

    return materials.filter((material) => !existingMaterialIds.has(material.id))
  }, [editingRule?.id, materials, rules])

  const selectedMaterial = useMemo(
    () => (editingRule?.materialId ? materialMap.get(editingRule.materialId) ?? null : null),
    [editingRule?.materialId, materialMap]
  )

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      try {
        const [allRules, allMaterials] = await Promise.all([
          packagingService.getRules(),
          materialService.getMaterialOptions(),
        ])
        setRules(allRules)
        setMaterials(allMaterials)
      } catch (error) {
        failLoudly(error, 'MaterialAssemblyManager.loadData')
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [t])

  const handleSave = async () => {
    const factor = editingRule?.conversionFactor
    const isFactorValid = typeof factor === 'number' && Number.isFinite(factor) && factor > 0

    if (!editingRule?.materialId || !editingRule?.packUnit || !editingRule?.baseUnit || !isFactorValid) {
      toast.error(t('materialArchive.assemblyManager.toasts.incomplete'))
      return
    }

    try {
      const saved = await packagingService.saveRule(editingRule as PackagingRule)

      setRules((current) =>
        editingRule.id
          ? current.map((rule) => (rule.id === saved.id ? saved : rule))
          : [...current, saved]
      )

      toast.success(t('materialArchive.assemblyManager.toasts.saveSuccess'))
      setIsDialogOpen(false)
      setEditingRule(null)
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
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('materialArchive.assemblyManager.toasts.deleteConfirm'))) return

    try {
      await packagingService.deleteRule(id)
      setRules((current) => current.filter((rule) => rule.id !== id))
      toast.success(t('materialArchive.assemblyManager.toasts.deleteSuccess'))
    } catch (error) {
      failLoudly(error, 'MaterialAssemblyManager.handleDelete')
    }
  }

  const columns: ColumnDef<PackagingRule>[] = [
    {
      id: 'code',
      header: () => (
        <div className='w-[120px] pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.code')}
        </div>
      ),
      cell: ({ row }) => (
        <div className='pl-8 font-mono text-[10px] font-black text-muted-foreground'>
          {materialMap.get(row.original.materialId)?.code}
        </div>
      ),
    },
    {
      id: 'name',
      header: () => (
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.name')}
        </div>
      ),
      cell: ({ row }) => (
        <div className='text-sm font-bold tracking-tight'>
          {materialMap.get(row.original.materialId)?.name}
        </div>
      ),
    },
    {
      id: 'baseUnit',
      header: () => (
        <div className='w-[100px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.baseUnit')}
        </div>
      ),
      cell: ({ row }) => (
        <Badge
          variant='outline'
          className='h-5 rounded-full border-none bg-muted/5 text-[8px] font-black tracking-widest text-muted-foreground/50'
        >
          {materialMap.get(row.original.materialId)?.uom || row.original.baseUnit}
        </Badge>
      ),
    },
    {
      accessorKey: 'packUnit',
      header: () => (
        <div className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.packUnit')}
        </div>
      ),
      cell: ({ row }) => (
        <Badge className='h-5 rounded-full border-none bg-primary/10 px-3 text-[8px] font-black tracking-widest text-primary'>
          {row.original.packUnit}
        </Badge>
      ),
    },
    {
      accessorKey: 'conversionFactor',
      header: () => (
        <div className='w-[120px] text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.factor')}
        </div>
      ),
      cell: ({ row }) => (
        <div className='font-mono text-xs font-black tracking-tighter text-primary'>
          x {row.original.conversionFactor}
        </div>
      ),
    },
    {
      id: 'preview',
      header: () => (
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.preview')}
        </div>
      ),
      cell: ({ row }) => {
        const rule = row.original
        const currentBaseUnit = materialMap.get(rule.materialId)?.uom || rule.baseUnit
        const relation =
          rule.direction === 'reverse'
            ? `1 ${currentBaseUnit} = ${rule.conversionFactor} ${rule.packUnit}`
            : `1 ${rule.packUnit} = ${rule.conversionFactor} ${currentBaseUnit}`

        return (
          <div className='font-mono text-[9px] font-black tracking-widest text-muted-foreground/40'>
            {relation}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => (
        <div className='w-[100px] pr-8 text-right text-[10px] font-black tracking-widest text-muted-foreground/50'>
          {t('materialArchive.assemblyManager.table.actions')}
        </div>
      ),
      cell: ({ row }) => {
        const rule = row.original
        const currentBaseUnit = materialMap.get(rule.materialId)?.uom || rule.baseUnit

        return (
          <div className='flex items-center justify-end gap-2 pr-8'>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg transition-all hover:bg-primary/5 hover:text-primary'
              onClick={() => {
                setEditingRule({
                  ...rule,
                  baseUnit: currentBaseUnit,
                })
                setIsDialogOpen(true)
              }}
            >
              <Settings2 className='size-4 text-muted-foreground/30 transition-colors group-hover:text-primary' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-lg text-destructive/40 transition-all hover:bg-destructive/10 hover:text-destructive'
              onClick={() => handleDelete(rule.id)}
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredRules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  return (
    <div className='flex flex-col gap-8 px-4 pb-6 pt-0 md:px-6 animate-in fade-in duration-700'>
      <PageHeader
        icon={ArrowRightLeft}
        title={t('materialArchive.assemblyManager.title')}
        description={t('materialArchive.assemblyManager.description')}
      />

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('materialArchive.assemblyManager.searchPlaceholder')}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium shadow-inner transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setEditingRule({ baseUnit: '', packUnit: '', conversionFactor: 1, direction: 'forward' })
            setIsDialogOpen(true)
          }}
          className='h-11 rounded-full bg-primary px-6 text-[10px] font-black tracking-widest text-primary-foreground shadow-xl shadow-blue-500/20 transition-all active:scale-95 hover:bg-primary/90'
        >
          <Plus className='mr-2 size-4' />
          {t('materialArchive.assemblyManager.addRule')}
        </Button>
      </div>

      <div className='relative shrink-0 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
        <Table>
          <TableHeader className='h-14 bg-muted/30'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className='border-b border-dashed border-muted/50 hover:bg-transparent'
              >
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='p-0 align-middle'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-32 text-center text-muted-foreground'>
                  {isLoading
                    ? t('materialArchive.assemblyManager.emptyLoading')
                    : t('materialArchive.assemblyManager.emptyState')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='group h-16 border-b border-dashed border-muted/50 transition-all hover:bg-muted/30'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className='p-0 align-middle'>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='pt-2'>
        <DataTablePagination table={table} />
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingRule(null)
        }}
      >
        <DialogContent className='overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-[550px]'>
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
          <div className='relative max-h-[90vh] overflow-y-auto p-8'>
            <DialogHeader className='mb-8'>
              <DialogTitle className='flex items-center gap-2 text-lg font-black italic tracking-tighter text-primary'>
                <Settings2 className='size-5' />
                {t('materialArchive.assemblyManager.dialog.title')}
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 opacity-60'>
                {t('materialArchive.assemblyManager.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-8'>
              <div className='space-y-4'>
                <Label className='mb-2 block text-[10px] font-black tracking-widest text-muted-foreground/60'>
                  {t('materialArchive.assemblyManager.dialog.materialLabel')}
                </Label>
                <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      role='combobox'
                      className='h-12 w-full justify-between rounded-2xl border-none bg-muted/50 px-5 font-bold shadow-sm transition-all hover:bg-muted/70'
                    >
                      <span className='truncate'>
                        {selectedMaterial
                          ? `${selectedMaterial.name} (${selectedMaterial.code})`
                          : t('materialArchive.assemblyManager.dialog.materialPlaceholder')}
                      </span>
                      <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className='w-[486px] overflow-hidden rounded-2xl border-none p-0 shadow-2xl'
                    align='start'
                  >
                    <Command className='rounded-2xl'>
                      <CommandInput
                        placeholder={t('materialArchive.assemblyManager.dialog.searchMaterialsPlaceholder')}
                        className='h-12 border-none'
                      />
                      <CommandList className='max-h-[300px]'>
                        <CommandEmpty>
                          {t('materialArchive.assemblyManager.dialog.noMaterialFound')}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableMaterials.slice(0, 50).map((material) => (
                            <CommandItem
                              key={material.id}
                              value={`${material.name} ${material.code} ${material.spec || ''}`}
                              onSelect={() => {
                                setEditingRule({
                                  ...editingRule,
                                  materialId: material.id,
                                  baseUnit: material.uom || '',
                                })
                                setIsComboboxOpen(false)
                              }}
                              className='flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-muted/50'
                            >
                              <div className='flex flex-col gap-1'>
                                <div className='flex items-center gap-2'>
                                  <span className='text-sm font-bold tracking-tight'>{material.name}</span>
                                  {material.spec && (
                                    <Badge
                                      variant='outline'
                                      className='h-4 rounded-full border-none bg-muted/20 px-2 text-[8px] font-black tracking-widest text-muted-foreground'
                                    >
                                      {material.spec}
                                    </Badge>
                                  )}
                                </div>
                                <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                                  {t('materialArchive.assemblyManager.dialog.materialMeta', {
                                    code: material.code,
                                    unit: material.uom,
                                  })}
                                </span>
                              </div>
                              <Check
                                className={cn(
                                  'h-4 w-4 text-primary transition-opacity',
                                  editingRule?.materialId === material.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className='space-y-4'>
                <Label className='block pl-1 text-[10px] font-black tracking-widest text-muted-foreground/60'>
                  {t('materialArchive.assemblyManager.dialog.packagingLabel')}
                </Label>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='packUnit'
                      className='block pl-1 text-[8px] font-black tracking-widest text-primary/60'
                    >
                      {t('materialArchive.assemblyManager.dialog.packUnitLabel')}
                    </Label>
                    <Input
                      id='packUnit'
                      placeholder={t('materialArchive.assemblyManager.dialog.packUnitPlaceholder')}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-sm'
                      value={editingRule?.packUnit || ''}
                      onChange={(event) =>
                        setEditingRule({ ...editingRule, packUnit: event.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='baseUnit'
                      className='block pl-1 text-[8px] font-black tracking-widest text-muted-foreground/60'
                    >
                      {t('materialArchive.assemblyManager.dialog.baseUnitLabel')}
                    </Label>
                    <Input
                      id='baseUnit'
                      readOnly
                      disabled
                      className='h-12 rounded-2xl border-none bg-muted/20 font-mono font-black italic text-primary/30'
                      value={editingRule?.baseUnit || ''}
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <Label
                    htmlFor='factor'
                    className='block text-[10px] font-black tracking-widest text-muted-foreground/60'
                  >
                    {t('materialArchive.assemblyManager.dialog.factorLabel')}
                  </Label>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 rounded-full border border-dashed border-primary/20 px-4 text-[10px] font-black tracking-widest transition-all hover:bg-primary/10 hover:text-primary'
                    onClick={() =>
                      setEditingRule({
                        ...editingRule,
                        direction: editingRule?.direction === 'forward' ? 'reverse' : 'forward',
                      })
                    }
                  >
                    <ArrowRightLeft className='size-3' />
                    {t('materialArchive.assemblyManager.dialog.switchDirection')}
                  </Button>
                </div>
                <div className='flex flex-col gap-6'>
                  <div className='flex items-center gap-4'>
                    <div className='relative flex-1'>
                      <Input
                        id='factor'
                        type='number'
                        step='any'
                        className='h-16 rounded-[24px] border-none bg-muted/50 text-center font-mono text-2xl font-black shadow-inner focus-visible:ring-primary'
                        value={editingRule?.conversionFactor ?? 1}
                        onChange={(event) => {
                          const value = Number.parseFloat(event.target.value)
                          setEditingRule({
                            ...editingRule,
                            conversionFactor: Number.isNaN(value) ? 0 : value,
                          })
                        }}
                      />
                    </div>
                    <div className='relative flex-[1.5] overflow-hidden rounded-[24px] border border-dashed border-primary/10 bg-primary/5 p-5 shadow-inner'>
                      <div className='flex flex-col items-center justify-center'>
                        <span className='mb-3 text-[10px] font-black tracking-widest text-muted-foreground/50'>
                          {t('materialArchive.assemblyManager.dialog.previewTitle')}
                        </span>
                        <div className='flex items-center gap-4'>
                          {editingRule?.direction !== 'reverse' ? (
                            <>
                              <span className='text-xl font-black tracking-tighter text-primary'>
                                1 {editingRule?.packUnit || '?'}
                              </span>
                              <span className='text-xs font-black text-muted-foreground/30'>=</span>
                              <span className='text-xl font-black tracking-tighter'>
                                {editingRule?.conversionFactor || '?'} {editingRule?.baseUnit || '?'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className='text-xl font-black tracking-tighter text-primary'>
                                1 {editingRule?.baseUnit || '?'}
                              </span>
                              <span className='text-xs font-black text-muted-foreground/30'>=</span>
                              <span className='text-xl font-black tracking-tighter'>
                                {editingRule?.conversionFactor || '?'} {editingRule?.packUnit || '?'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='rounded-2xl border border-dashed border-rose-500/10 bg-rose-500/5 p-4'>
                    <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-rose-600'>
                      <span className='size-2 rounded-full bg-rose-500 animate-pulse' />
                      {t('materialArchive.assemblyManager.dialog.verificationRequired')}
                    </p>
                    <p className='ml-4 mt-2 text-[10px] font-bold text-muted-foreground'>
                      {t('materialArchive.assemblyManager.dialog.currentRelation', {
                        relation: buildRelation(editingRule),
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className='flex items-center justify-between gap-4 bg-transparent p-8 pt-0'>
            <Button
              variant='ghost'
              className='h-12 flex-1 rounded-full text-[10px] font-black tracking-widest hover:bg-muted'
              onClick={() => setIsDialogOpen(false)}
            >
              {t('materialArchive.assemblyManager.dialog.cancel')}
            </Button>
            <Button
              className='h-12 flex-1 rounded-full bg-primary text-[10px] font-black tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95 hover:bg-primary/90'
              onClick={handleSave}
            >
              {t('materialArchive.assemblyManager.dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
