'use client'

import { useRef } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { TranslationKey } from '@/locales'
import { UnitActionDialog } from '../components/unit-action-dialog'
import { UnitExcelTemplate } from '../utils/unit-excel-utils'
import type { UnitCategory } from '../services/unit-service'
import { useUnitMgmt } from '../hooks/use-unit-mgmt'
import { useUnitImport } from '../hooks/use-unit-import'

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
  const { isImporting, handleExcelImport } = useUnitImport(() => refreshData(true))

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {/* 顶级标准页眉布局 */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black italic tracking-tighter uppercase'>
            {t('basicSettings.units.page.title')}
          </h2>
          <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>
            {t('basicSettings.units.page.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='flex items-center gap-4 px-4 py-1.5 rounded-full bg-primary/5 border border-dashed border-primary/20 h-9 shrink-0'>
            <span className='text-[9px] font-black text-primary/60 uppercase tracking-widest italic'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void refreshData(true)}
            className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-primary/5 hover:text-primary transition-all'
          >
            <RefreshCcw className={cn('size-3', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* 增强工业感操作栏 */}
      <div className='flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center w-full xl:w-auto'>
          {/* 搜索框 */}
          <div className='relative w-full sm:w-72 group'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary pointer-events-none' />
            <Input
              placeholder={t('basicSettings.units.page.searchPlaceholder')}
              className='pl-10 h-12 text-sm font-medium rounded-2xl bg-background border-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all outline-none shadow-sm'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* 分类过滤 Tab */}
          <div className='flex bg-muted/50 p-1 rounded-full border border-muted/50 shadow-inner overflow-x-auto max-w-full no-scrollbar'>
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={cn(
                'px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all italic whitespace-nowrap',
                categoryFilter === 'ALL'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/40 hover:text-muted-foreground',
              )}
            >
              {t('basicSettings.units.filters.all')}
            </button>
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategoryFilter(option.value)}
                className={cn(
                  'px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all italic whitespace-nowrap',
                  categoryFilter === option.value
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground/40 hover:text-muted-foreground',
                )}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* 具按钮组 */}
        <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0'>
          <input
            ref={importInputRef}
            type='file'
            className='hidden'
            accept='.xlsx, .xls'
            onChange={handleExcelImport}
            disabled={isImporting}
          />
          <Button
            variant='outline'
            onClick={() => UnitExcelTemplate.downloadTemplate(locale)}
            className='flex-1 sm:flex-none rounded-full h-11 px-5 font-black text-[10px] uppercase tracking-widest border-dashed gap-2 hover:bg-background'
          >
            <Download className='size-4' />
            {t('basicSettings.units.toolbar.downloadTemplate')}
          </Button>
          <Button
            variant='outline'
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className='flex-1 sm:flex-none rounded-full h-11 px-5 font-black text-[10px] uppercase tracking-widest border-dashed gap-2 hover:bg-background'
          >
            <FileUp className={cn('size-4', isImporting && 'animate-pulse')} />
            {isImporting
                ? t('basicSettings.units.toolbar.importing')
                : t('basicSettings.units.toolbar.dataImport')}
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            disabled={isImporting}
            className='w-full sm:w-auto rounded-full shadow-lg shadow-primary/10 h-11 px-8 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2'
          >
            <Plus className='size-4' />
            {t('basicSettings.units.toolbar.addNew')}
          </Button>
        </div>
      </div>

      {/* 数据表格区域 */}
      <div className='rounded-[32px] border border-dashed border-muted/50 overflow-hidden bg-background shadow-inner relative'>
        <ScrollArea className='w-full' orientation='horizontal'>
            <div className='min-w-[800px]'>
              <Table>
                <TableHeader className='bg-muted/10 h-16'>
                  <TableRow className='hover:bg-transparent border-b border-dashed border-muted/50'>
                    <TableHead className='pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.code')}
                    </TableHead>
                    <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.name')}
                    </TableHead>
                    <TableHead className='text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.category')}
                    </TableHead>
                    <TableHead className='text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.precision')}
                    </TableHead>
                    <TableHead className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.description')}
                    </TableHead>
                    <TableHead className='text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('basicSettings.units.table.status')}
                    </TableHead>
                    <TableHead className='w-[80px] pr-8' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <TableRow key={index} className='h-20 animate-pulse border-b border-dashed border-muted/50'>
                          <TableCell className='pl-8'><div className='h-4 w-16 bg-muted/50 rounded-lg' /></TableCell>
                          <TableCell><div className='h-4 w-32 bg-muted/50 rounded-lg' /></TableCell>
                          <TableCell><div className='h-5 w-20 bg-muted/50 rounded-full mx-auto' /></TableCell>
                          <TableCell><div className='h-4 w-8 bg-muted/50 rounded-lg mx-auto' /></TableCell>
                          <TableCell><div className='h-4 w-48 bg-muted/50 rounded-lg' /></TableCell>
                          <TableCell><div className='h-5 w-16 bg-muted/50 rounded-full mx-auto' /></TableCell>
                          <TableCell />
                        </TableRow>
                      ))
                    : filteredUnits.map((unit) => {
                        const categoryLabel: TranslationKey =
                          CATEGORY_OPTIONS.find((option) => option.value === unit.category)?.labelKey ??
                          'basicSettings.units.categories.other'

                        return (
                          <TableRow
                            key={unit.id}
                            className={cn(
                              'group hover:bg-muted/5 transition-colors border-b border-dashed border-muted/50 last:border-0 h-20',
                              unit.status !== 'active' && 'opacity-40 grayscale',
                            )}
                          >
                            <TableCell className='pl-8'>
                              <div className='flex items-center gap-2'>
                                <span className='font-mono text-[10px] font-black text-primary tracking-widest italic'>
                                  {unit.code}
                                </span>
                                {unit.isSystem && <ShieldCheck className='size-3 text-blue-500/60' />}
                              </div>
                            </TableCell>
                            <TableCell className='font-black text-sm text-slate-800 italic uppercase tracking-tighter'>
                              {unit.name}
                            </TableCell>
                            <TableCell className='text-center'>
                              <Badge variant='outline' className='text-[8px] font-black uppercase px-2 h-5 border-none rounded-md bg-muted/50 text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm'>
                                {t(categoryLabel)}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-center font-mono text-[10px] font-black text-muted-foreground/40 italic'>
                              {unit.precision}
                            </TableCell>
                            <TableCell>
                                <p className='text-[10px] text-muted-foreground/30 font-bold uppercase tracking-tight line-clamp-1 group-hover:line-clamp-none transition-all'>
                                    {unit.description || '-'}
                                </p>
                            </TableCell>
                            <TableCell className='text-center'>
                              {unit.status === 'active' ? (
                                <Badge className='bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black px-2 rounded-full uppercase h-5 italic'>
                                  {t('basicSettings.units.statuses.active')}
                                </Badge>
                              ) : (
                                <Badge className='bg-muted text-muted-foreground/40 border-none text-[8px] font-black px-2 rounded-full uppercase h-5 italic'>
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
                                    className='size-9 rounded-full opacity-30 group-hover:opacity-100 transition-opacity hover:bg-background'
                                  >
                                    <MoreHorizontal className='size-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align='end'
                                  className='w-48 rounded-[24px] p-2 border-dashed shadow-2xl'
                                >
                                  <DropdownMenuLabel className='text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-2 italic'>
                                    {t('basicSettings.units.menu.label')}
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenDialog(unit)}
                                    className='rounded-xl font-bold text-xs py-2 cursor-pointer'
                                  >
                                    <Edit2 className='size-4 mr-2' />
                                    {t('basicSettings.units.menu.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className='my-1 border-dashed' />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(unit)}
                                    disabled={unit.isSystem}
                                    className='rounded-xl font-black text-xs py-2 text-rose-600 focus:text-rose-600 cursor-pointer disabled:opacity-20'
                                  >
                                    <Trash2 className='size-4 mr-2' />
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
            <Scale className='size-16 mb-6 opacity-5' />
            <p className='text-[11px] font-black uppercase tracking-widest'>{t('basicSettings.units.table.empty')}</p>
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
