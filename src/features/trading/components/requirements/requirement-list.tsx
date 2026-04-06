'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, ChevronDown, Layers, Search } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { type MaterialRequirement } from '../../hooks/use-requirements'

interface RequirementListProps {
  data: MaterialRequirement[]
  isLoading: boolean
}

export function RequirementList({ data, isLoading }: RequirementListProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyShortage, setOnlyShortage] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const groupedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const matchesSearch =
        item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.materialCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.materialSpec.toLowerCase().includes(searchQuery.toLowerCase())

      if (onlyShortage) return matchesSearch && item.shortageGap > 0
      return matchesSearch
    })

    const groups: Record<string, MaterialRequirement[]> = {}
    filtered.forEach((item) => {
      if (!groups[item.section]) groups[item.section] = []
      groups[item.section].push(item)
    })
    return groups
  }, [data, searchQuery, onlyShortage])

  const sections = Object.keys(groupedData).sort()

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[section] ?? true
      return { ...prev, [section]: !isCurrentlyOpen }
    })
  }

  if (isLoading) {
    return (
      <div className='h-[400px] flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
      </div>
    )
  }

  return (
    <div className='space-y-4 animate-in fade-in duration-500 pb-20'>
      <div className='flex items-center gap-4 bg-background/50 backdrop-blur-sm p-1 rounded-2xl border shadow-sm sticky top-0 z-10 mx-1'>
        <div className='relative flex-1'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30' />
          <Input
            placeholder={t('trading.requirements.list.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className='pl-11 h-11 border-none bg-transparent font-black text-[12px] focus-visible:ring-0 placeholder:font-bold placeholder:text-muted-foreground/30'
          />
        </div>
        <div className='h-5 w-px bg-muted mx-1' />
        <div className='flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl mr-1 border border-slate-100'>
          <Switch id='shortage-filter' checked={onlyShortage} onCheckedChange={setOnlyShortage} />
          <Label
            htmlFor='shortage-filter'
            className='text-[10px] font-black uppercase text-amber-600 cursor-pointer select-none'
          >
            {t('trading.requirements.list.shortageOnly')}
          </Label>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className='rounded-2xl border-2 border-dashed h-[50vh] flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5 mx-1'>
          <div className='size-10 rounded-full border-2 border-dashed mb-3 flex items-center justify-center'>
            <span className='text-[10px] font-black'>?</span>
          </div>
          <p className='text-[10px] font-black uppercase tracking-[0.2em]'>
            {t('trading.requirements.list.empty')}
          </p>
        </div>
      ) : (
        <div className='space-y-3 px-1'>
          {sections.map((section) => {
            const isOpen = openSections[section] ?? true
            return (
              <Collapsible
                key={section}
                open={isOpen}
                onOpenChange={() => toggleSection(section)}
                className='border border-dashed rounded-[24px] bg-muted/5 overflow-hidden shadow-inner'
              >
                <CollapsibleTrigger className='w-full hover:no-underline px-6 py-4 bg-muted/5 group flex items-center justify-between text-left transition-colors'>
                  <div className='flex items-center gap-5'>
                    <div className='size-12 rounded-[20px] bg-primary/10 flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-sm border border-primary/20'>
                      <Layers className='size-6 text-primary' />
                    </div>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[16px] font-black uppercase tracking-tighter italic'>{section}</span>
                      <div className='flex items-center gap-2 uppercase'>
                        <Badge
                          variant='secondary'
                          className='text-[10px] font-black px-2 py-0.5 h-4.5 rounded-full bg-primary/10 text-primary border-primary/20'
                        >
                          {t('trading.requirements.list.items', {
                            count: groupedData[section].length,
                          })}
                        </Badge>
                        <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                          {t('trading.requirements.list.groupedOrders')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'p-2.5 rounded-2xl transition-all duration-500',
                      'bg-muted/20 text-muted-foreground/30 group-hover:bg-primary/10 group-hover:text-primary',
                      isOpen && 'bg-primary text-white shadow-lg shadow-primary/20'
                    )}
                  >
                    <ChevronDown
                      className={cn('size-5 transition-transform duration-500', isOpen && 'rotate-180')}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className='CollapsibleContent border-t'>
                  <Table className='w-full border-collapse text-left'>
                     <TableHeader className='bg-muted/10'>
                      <TableRow className='hover:bg-transparent border-b border-dashed'>
                        <TableHead className='w-[100px] min-w-[100px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pl-6 py-4 italic'>
                          {t('trading.requirements.list.headers.code')}
                        </TableHead>
                        <TableHead className='w-auto min-w-[200px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 py-4 italic'>
                          {t('trading.requirements.list.headers.name')}
                        </TableHead>
                        <TableHead className='w-[90px] min-w-[90px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right py-4 italic'>
                          {t('trading.requirements.list.headers.total')}
                        </TableHead>
                        <TableHead className='w-[90px] min-w-[90px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right py-4 italic'>
                          {t('trading.requirements.list.headers.inventory')}
                        </TableHead>
                        <TableHead className='w-[110px] min-w-[110px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right py-4 italic'>
                          {t('trading.requirements.list.headers.gap')}
                        </TableHead>
                        <TableHead className='w-[150px] min-w-[150px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 py-4 text-center italic'>
                          {t('trading.requirements.list.headers.packaging')}
                        </TableHead>
                        <TableHead className='w-[140px] min-w-[140px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pr-6 py-4 text-right italic'>
                          {t('trading.requirements.list.headers.status')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedData[section].map((requirement) => (
                        <TableRow
                          key={requirement.materialId}
                          className='group hover:bg-muted/5 transition-colors border-b last:border-0 text-left'
                        >
                          <TableCell className='w-[100px] min-w-[100px] truncate font-mono text-[10px] font-bold text-muted-foreground/70 pl-6 py-3'>
                            {requirement.materialCode}
                          </TableCell>
                          <TableCell className='w-auto py-3 text-left'>
                            <div className='flex flex-col gap-0.5 max-w-[240px] truncate'>
                              <span className='text-[12px] font-black leading-tight truncate'>
                                {requirement.materialName}
                              </span>
                              <span className='text-[10px] text-muted-foreground/50 font-medium truncate'>
                                {requirement.materialSpec}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='w-[90px] min-w-[90px] text-right py-3'>
                            <span className='text-[12px] font-bold text-slate-800 tabular-nums'>
                              {requirement.totalRequired.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              <span className='text-[9px] ml-0.5 text-muted-foreground/50 font-medium'>
                                {requirement.unit}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className='w-[90px] min-w-[90px] text-right py-3'>
                            <span
                              className={cn(
                                'text-[12px] font-bold tabular-nums',
                                requirement.inventoryQty === 0 ? 'text-slate-400' : 'text-blue-600'
                              )}
                            >
                              {requirement.inventoryQty.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              <span className='text-[9px] ml-0.5 opacity-50 font-medium'>
                                {requirement.unit}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className='w-[110px] min-w-[110px] text-right py-3 bg-slate-50/10'>
                            {requirement.shortageGap > 0 ? (
                              <div className='flex flex-col items-end'>
                                <span className='text-[14px] font-black text-rose-600 tabular-nums tracking-tighter'>
                                  -{requirement.shortageGap.toLocaleString(undefined, {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1,
                                  })}
                                  <span className='text-[10px] ml-0.5 font-bold'>
                                    {requirement.unit}
                                  </span>
                                </span>
                                {requirement.packaging && (
                                  <div className='text-[9px] font-bold text-amber-600/80 bg-amber-50 px-1 rounded border border-amber-100/50 mt-0.5 shadow-sm'>
                                    {t('trading.requirements.list.packagingAtLeast', {
                                      count: requirement.packaging.packQty,
                                      unit: requirement.packaging.packUnit,
                                    })}
                                  </div>
                                )}
                                <div className='flex items-center gap-0.5 text-[8px] font-black text-rose-400 uppercase mt-1'>
                                  <AlertTriangle className='size-2' />
                                  {t('trading.requirements.list.needPurchase')}
                                </div>
                              </div>
                            ) : (
                              <Badge
                                variant='outline'
                                className='text-[10px] font-black px-1.5 py-0 rounded bg-green-50 border-green-200 text-green-600 border-dashed'
                              >
                                {t('trading.requirements.list.sufficient')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className='w-[140px] min-w-[140px] py-3 text-left'>
                            {requirement.packaging ? (
                              <div className='flex flex-col'>
                                <div className='flex items-center gap-1.5'>
                                  <span className='text-[12px] font-black text-green-600'>
                                    {requirement.packaging.packQty} {requirement.packaging.packUnit}
                                  </span>
                                  <ArrowRightLeft className='size-2 text-muted-foreground/40' />
                                </div>
                                <span className='text-[9px] text-muted-foreground/50 font-bold whitespace-nowrap'>
                                  {requirement.packaging.direction === 'reverse'
                                    ? t('trading.requirements.export.packagingFormulaReverse', {
                                        unit: requirement.unit,
                                        factor: requirement.packaging.factor,
                                        packUnit: requirement.packaging.packUnit,
                                      })
                                    : t('trading.requirements.export.packagingFormulaForward', {
                                        unit: requirement.unit,
                                        factor: requirement.packaging.factor,
                                        packUnit: requirement.packaging.packUnit,
                                      })}
                                </span>
                              </div>
                            ) : (
                              <span className='text-[10px] text-muted-foreground/30'>-</span>
                            )}
                          </TableCell>
                          <TableCell className='w-[130px] min-w-[130px] text-right pr-6 py-3'>
                            <div className='flex flex-col items-end gap-1'>
                              <div className='flex items-center gap-1.5'>
                                <span
                                  className={cn(
                                    'text-[9px] font-black uppercase tracking-tighter',
                                    requirement.shortageGap > 0 ? 'text-amber-600' : 'text-green-600'
                                  )}
                                >
                                  {requirement.shortageGap > 0
                                    ? t('trading.requirements.list.pendingPrep')
                                    : t('trading.requirements.list.ready')}
                                </span>
                                <div
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    requirement.shortageGap > 0
                                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                                      : 'bg-green-500'
                                  )}
                                />
                              </div>
                              <div className='flex flex-wrap gap-1 justify-end'>
                                <span className='text-[8px] font-bold text-muted-foreground/40'>
                                  {t('trading.requirements.list.sourceOrders', {
                                    count: requirement.sourceOrders.length,
                                  })}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      )}
    </div>
  )
}
