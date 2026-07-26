'use client'

import { useRef } from 'react'
import type { TranslationKey } from '@/locales'
import {
  Download,
  Edit2,
  FileUp,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UnitActionDialog } from '../components/unit-action-dialog'
import { useUnitImport } from '../hooks/use-unit-import'
import { useUnitMgmt } from '../hooks/use-unit-mgmt'
import type { UnitCategory } from '../services/unit-service'
import { UnitExcelTemplate } from '../utils/unit-excel-utils'

const CATEGORY_OPTIONS: Array<{
  value: UnitCategory
  labelKey: TranslationKey
}> = [
  { value: 'QUANTITY', labelKey: 'basicSettings.units.categories.quantity' },
  { value: 'WEIGHT', labelKey: 'basicSettings.units.categories.weight' },
  { value: 'LENGTH', labelKey: 'basicSettings.units.categories.length' },
  { value: 'AREA', labelKey: 'basicSettings.units.categories.area' },
  { value: 'VOLUME', labelKey: 'basicSettings.units.categories.volume' },
  { value: 'TIME', labelKey: 'basicSettings.units.categories.time' },
  { value: 'OTHER', labelKey: 'basicSettings.units.categories.other' },
]

export function UnitMgmt() {
  const { locale, t } = useLanguage()
  const importInputRef = useRef<HTMLInputElement>(null)

  // 核心管理 Hook
  const {
    filteredUnits,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingUnit,
    handleOpenDialog,
    handleDelete,
    refreshData,
  } = useUnitMgmt()

  // Excel 导入 Hook
  const { isImporting, handleExcelImport } = useUnitImport(() =>
    refreshData(true)
  )

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      {/* 顶级标准页眉布局 */}
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('basicSettings.units.page.title')}
          </h2>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('basicSettings.units.page.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex h-9 shrink-0 items-center gap-4 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5'>
            <span className='text-[9px] font-black tracking-widest text-primary/60 uppercase italic'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void refreshData(true)}
            className='h-9 rounded-full border-dashed text-[10px] font-black tracking-widest uppercase transition-all hover:bg-primary/5 hover:text-primary'
          >
            <RefreshCcw className={cn('size-3', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* 增强工业感操作栏 */}
      <div className='flex flex-col items-start justify-between gap-6 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6 xl:flex-row xl:items-center'>
        <div className='flex w-full flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center xl:w-auto'>
          {/* 搜索框 */}
          <div className='group relative w-full sm:w-72'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('basicSettings.units.page.searchPlaceholder')}
              className='h-12 rounded-2xl border-none bg-background pl-10 text-sm font-medium shadow-sm transition-all outline-none focus-visible:ring-1 focus-visible:ring-primary/20'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 分类过滤 Tab */}
          <div className='no-scrollbar flex max-w-full overflow-x-auto rounded-full border border-muted/50 bg-muted/50 p-1 shadow-inner'>
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={cn(
                'rounded-full px-5 py-1.5 text-[10px] font-black tracking-widest whitespace-nowrap uppercase italic transition-all',
                categoryFilter === 'ALL'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              )}
            >
              {t('basicSettings.units.filters.all')}
            </button>
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategoryFilter(option.value)}
                className={cn(
                  'rounded-full px-5 py-1.5 text-[10px] font-black tracking-widest whitespace-nowrap uppercase italic transition-all',
                  categoryFilter === option.value
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                )}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* 具按钮组 */}
        <div className='flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row'>
          <input
            ref={importInputRef}
            type='file'
            className='hidden'
            accept='.xlsx'
            onChange={handleExcelImport}
            disabled={isImporting}
          />
          <Button
            variant='outline'
            onClick={() => UnitExcelTemplate.downloadTemplate(locale)}
            className='h-11 flex-1 gap-2 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase hover:bg-background sm:flex-none'
          >
            <Download className='size-4' />
            {t('basicSettings.units.toolbar.downloadTemplate')}
          </Button>
          <Button
            variant='outline'
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className='h-11 flex-1 gap-2 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase hover:bg-background sm:flex-none'
          >
            <FileUp className={cn('size-4', isImporting && 'animate-pulse')} />
            {isImporting
              ? t('basicSettings.units.toolbar.importing')
              : t('basicSettings.units.toolbar.dataImport')}
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={isImporting}
            className='h-11 w-full gap-2 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/10 transition-all active:scale-95 sm:w-auto'
          >
            <Plus className='size-4' />
            {t('basicSettings.units.toolbar.addNew')}
          </Button>
        </div>
      </div>

      {/* 数据表格区域 */}
      <div className='relative overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-background shadow-inner'>
        <ScrollArea className='w-full' orientation='horizontal'>
          <div className='min-w-[800px]'>
            <Table>
              <TableHeader className='h-16 bg-muted/10'>
                <TableRow className='border-b border-dashed border-muted/50 hover:bg-transparent'>
                  <TableHead className='pl-8 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.code')}
                  </TableHead>
                  <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.name')}
                  </TableHead>
                  <TableHead className='text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.category')}
                  </TableHead>
                  <TableHead className='text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.precision')}
                  </TableHead>
                  <TableHead className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.description')}
                  </TableHead>
                  <TableHead className='text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('basicSettings.units.table.status')}
                  </TableHead>
                  <TableHead className='w-[80px] pr-8' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <TableRow
                        key={index}
                        className='h-20 animate-pulse border-b border-dashed border-muted/50'
                      >
                        <TableCell className='pl-8'>
                          <div className='h-4 w-16 rounded-lg bg-muted/50' />
                        </TableCell>
                        <TableCell>
                          <div className='h-4 w-32 rounded-lg bg-muted/50' />
                        </TableCell>
                        <TableCell>
                          <div className='mx-auto h-5 w-20 rounded-full bg-muted/50' />
                        </TableCell>
                        <TableCell>
                          <div className='mx-auto h-4 w-8 rounded-lg bg-muted/50' />
                        </TableCell>
                        <TableCell>
                          <div className='h-4 w-48 rounded-lg bg-muted/50' />
                        </TableCell>
                        <TableCell>
                          <div className='mx-auto h-5 w-16 rounded-full bg-muted/50' />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ))
                  : filteredUnits.map((unit) => {
                      const categoryLabel: TranslationKey =
                        CATEGORY_OPTIONS.find(
                          (option) => option.value === unit.category
                        )?.labelKey ?? 'basicSettings.units.categories.other'

                      return (
                        <TableRow
                          key={unit.id}
                          className={cn(
                            'group h-20 border-b border-dashed border-muted/50 transition-colors last:border-0 hover:bg-muted/5',
                            unit.status !== 'active' && 'opacity-40 grayscale'
                          )}
                        >
                          <TableCell className='pl-8'>
                            <div className='flex items-center gap-2'>
                              <span className='font-mono text-[10px] font-black tracking-widest text-primary italic'>
                                {unit.code}
                              </span>
                              {unit.isSystem && (
                                <ShieldCheck className='size-3 text-blue-500/60' />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className='text-sm font-black tracking-tighter text-slate-800 uppercase italic'>
                            {unit.name}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Badge
                              variant='outline'
                              className='h-5 rounded-md border-none bg-muted/50 px-2 text-[8px] font-black text-muted-foreground/60 uppercase shadow-sm transition-all group-hover:bg-primary/10 group-hover:text-primary'
                            >
                              {t(categoryLabel)}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-center font-mono text-[10px] font-black text-muted-foreground/40 italic'>
                            {unit.precision}
                          </TableCell>
                          <TableCell>
                            <p className='line-clamp-1 text-[10px] font-bold tracking-tight text-muted-foreground/30 uppercase transition-all group-hover:line-clamp-none'>
                              {unit.description || '-'}
                            </p>
                          </TableCell>
                          <TableCell className='text-center'>
                            {unit.status === 'active' ? (
                              <Badge className='h-5 rounded-full border-none bg-emerald-500/10 px-2 text-[8px] font-black text-emerald-600 uppercase italic'>
                                {t('basicSettings.units.statuses.active')}
                              </Badge>
                            ) : (
                              <Badge className='h-5 rounded-full border-none bg-muted px-2 text-[8px] font-black text-muted-foreground/40 uppercase italic'>
                                {t('basicSettings.units.statuses.inactive')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className='pr-8 text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='size-9 rounded-full opacity-30 transition-opacity group-hover:opacity-100 hover:bg-background'
                                >
                                  <MoreHorizontal className='size-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align='end'
                                className='w-48 rounded-[24px] border-dashed p-2 shadow-2xl'
                              >
                                <DropdownMenuLabel className='px-3 py-2 text-[9px] font-black tracking-widest uppercase italic opacity-40'>
                                  {t('basicSettings.units.menu.label')}
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDialog(unit)}
                                  className='cursor-pointer rounded-xl py-2 text-xs font-bold'
                                >
                                  <Edit2 className='mr-2 size-4' />
                                  {t('basicSettings.units.menu.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className='my-1 border-dashed' />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(unit)}
                                  disabled={unit.isSystem}
                                  className='cursor-pointer rounded-xl py-2 text-xs font-black text-rose-600 focus:text-rose-600 disabled:opacity-20'
                                >
                                  <Trash2 className='mr-2 size-4' />
                                  {t('basicSettings.units.menu.delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        {!isLoading && filteredUnits.length === 0 && (
          <div className='flex flex-col items-center justify-center py-40 text-muted-foreground/20 italic'>
            <Scale className='mb-6 size-16 opacity-5' />
            <p className='text-[11px] font-black tracking-widest uppercase'>
              {t('basicSettings.units.table.empty')}
            </p>
          </div>
        )}
      </div>

      {/* 弹窗组件保持原有结构供双 Hook 驱动 */}
      <UnitActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        unit={editingUnit}
        onSaveSuccess={() => refreshData(true)}
      />
    </div>
  )
}
