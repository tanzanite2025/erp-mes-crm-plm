'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Layers, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type MaterialRequirement } from '../../data/requirement-schema'
import { RequirementRow } from './requirement-row'

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

      if (onlyShortage) return matchesSearch && item.effectiveGap > 0
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
      <div className='flex h-[400px] items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-primary' />
      </div>
    )
  }

  return (
    <div className='animate-in space-y-4 pb-20 duration-500 fade-in'>
      <div className='sticky top-0 z-10 mx-1 flex items-center gap-4 rounded-2xl border bg-background/50 p-1 shadow-sm backdrop-blur-sm'>
        <div className='relative flex-1'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30' />
          <Input
            placeholder={t('mrp.requirements.list.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className='h-11 border-none bg-transparent pl-11 text-[12px] font-black placeholder:font-bold placeholder:text-muted-foreground/30 focus-visible:ring-0'
          />
        </div>
        <div className='mx-1 h-5 w-px bg-muted' />
        <div className='mr-1 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2'>
          <Switch
            id='shortage-filter'
            checked={onlyShortage}
            onCheckedChange={setOnlyShortage}
          />
          <Label
            htmlFor='shortage-filter'
            className='cursor-pointer text-[10px] font-black text-amber-600 uppercase select-none'
          >
            {t('mrp.requirements.list.shortageOnly')}
          </Label>
        </div>
      </div>
      {sections.length === 0 ? (
        <div className='mx-1 flex h-[50vh] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/5 text-muted-foreground/30'>
          <div className='mb-3 flex size-10 items-center justify-center rounded-full border-2 border-dashed'>
            <span className='text-[10px] font-black'>?</span>
          </div>
          <p className='text-[10px] font-black tracking-[0.2em] uppercase'>
            {t('mrp.requirements.list.empty')}
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
                className='overflow-hidden rounded-[24px] border border-dashed bg-muted/5 shadow-inner'
              >
                <CollapsibleTrigger className='group flex w-full items-center justify-between bg-muted/5 px-6 py-4 text-left transition-colors hover:no-underline'>
                  <div className='flex items-center gap-5'>
                    <div className='flex size-12 items-center justify-center rounded-[20px] border border-primary/20 bg-primary/10 shadow-sm transition-all duration-500 group-hover:rotate-12'>
                      <Layers className='size-6 text-primary' />
                    </div>
                    <div className='flex flex-col gap-0.5'>
                      <span className='text-[16px] font-black tracking-tighter uppercase italic'>
                        {section}
                      </span>
                      <div className='flex items-center gap-2 uppercase'>
                        <Badge
                          variant='secondary'
                          className='h-4.5 rounded-full border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary'
                        >
                          {t('mrp.requirements.list.items', {
                            count: groupedData[section].length,
                          })}
                        </Badge>
                        <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                          {t('mrp.requirements.list.groupedOrders')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-2xl p-2.5 transition-all duration-500',
                      'bg-muted/20 text-muted-foreground/30 group-hover:bg-primary/10 group-hover:text-primary',
                      isOpen &&
                        'bg-primary text-white shadow-lg shadow-primary/20'
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'size-5 transition-transform duration-500',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className='CollapsibleContent border-t'>
                  <Table className='w-full border-collapse text-left'>
                    <TableHeader className='bg-muted/10'>
                      <TableRow className='border-b border-dashed hover:bg-transparent'>
                        <TableHead className='w-[100px] min-w-[100px] py-4 pl-6 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.code')}
                        </TableHead>
                        <TableHead className='w-auto min-w-[200px] py-4 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.name')}
                        </TableHead>
                        <TableHead className='w-[90px] min-w-[90px] py-4 text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.total')}
                        </TableHead>
                        <TableHead className='w-[90px] min-w-[90px] py-4 text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.inventory')}
                        </TableHead>
                        <TableHead className='w-[200px] min-w-[200px] px-4 py-4 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.supplyAnalysis')}
                        </TableHead>
                        <TableHead className='w-[110px] min-w-[110px] py-4 text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.effectiveGap')}
                        </TableHead>
                        <TableHead className='w-[150px] min-w-[150px] py-4 text-center text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.packaging')}
                        </TableHead>
                        <TableHead className='w-[140px] min-w-[140px] py-4 pr-6 text-right text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('mrp.requirements.list.headers.status')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedData[section].map((requirement) => (
                        <RequirementRow
                          key={requirement.materialId}
                          requirement={requirement}
                        />
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
