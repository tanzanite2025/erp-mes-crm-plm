import { useState } from 'react'
import { Search, Plus, Calculator, Edit2, Clock, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import type { InspectionFormula } from '../data/schema'
import { formatQualityActorName } from '../utils/quality-utils'

function normalizeFormulaStatus(status?: string) {
  const normalized = status?.toUpperCase()
  if (status === '停用' || normalized === 'DISABLED') return 'DISABLED'
  if (status === '正常' || normalized === 'NORMAL') return 'NORMAL'
  return 'UNKNOWN'
}

function getFormulaStatusLabel(
  t: ReturnType<typeof useLanguage>['t'],
  status?: string
) {
  const normalized = normalizeFormulaStatus(status)
  if (normalized === 'DISABLED') return t('quality.formulas.table.disabled')
  if (normalized === 'NORMAL') return t('quality.formulas.table.normal')
  return status || t('quality.common.unknown')
}

export function QualityFormulas() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const formulas: InspectionFormula[] = []

  const filteredFormulas = formulas.filter(
    (formula) =>
      formula.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formula.formula.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Calculator}
        title={t('quality.formulas.page.title')}
        description={t('quality.formulas.page.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 lg:flex-row lg:items-center'>
        <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
          <div className='flex items-center gap-6'>
            <div className='flex flex-col'>
              <span className='mb-1 text-[10px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase'>
                {t('quality.formulas.page.registered')}
              </span>
              <div className='flex items-baseline gap-1'>
                <span className='text-2xl font-black tracking-tighter text-primary italic tabular-nums'>
                  {formulas.length}
                </span>
                <span className='text-[10px] font-black opacity-20'>
                  {t('quality.formulas.page.algorithms')}
                </span>
              </div>
            </div>
            <div className='h-8 w-px border-l border-dashed bg-muted-foreground/10' />
          </div>

          <div className='group relative flex-1'>
            <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('quality.formulas.page.searchPlaceholder')}
              className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-[11px] font-bold tracking-tight uppercase shadow-inner transition-all focus:bg-background sm:w-[320px] lg:w-[380px]'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            size='sm'
            className='h-11 flex-1 gap-2 rounded-full bg-primary px-6 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 sm:flex-initial'
          >
            <Plus className='size-4' />
            {t('quality.formulas.page.add')}
          </Button>
        </div>
      </div>

      <div className='relative flex flex-col overflow-hidden rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 shadow-inner'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
        <div className='overflow-x-auto'>
          <Table className='min-w-[1200px] border-separate border-spacing-y-0'>
            <TableHeader className='sticky top-0 z-10 bg-muted/40'>
              <TableRow className='border-none hover:bg-transparent'>
                <TableHead className='w-[60px] py-5 pl-8 text-center text-[9px] font-black tracking-widest uppercase'>
                  {t('quality.formulas.table.no')}
                </TableHead>
                <TableHead className='w-[300px] py-5 text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.name')}
                </TableHead>
                <TableHead className='py-5 text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.logic')}
                </TableHead>
                <TableHead className='w-[100px] py-5 text-center text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.status')}
                </TableHead>
                <TableHead className='w-[120px] py-5 text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.operator')}
                </TableHead>
                <TableHead className='w-[180px] py-5 text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.operateTime')}
                </TableHead>
                <TableHead className='w-[200px] py-5 text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.remarks')}
                </TableHead>
                <TableHead className='flex w-[80px] items-center justify-end py-5 pr-8 text-right text-[9px] font-black tracking-widest uppercase italic'>
                  {t('quality.formulas.table.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFormulas.map((formula, index) => {
                const operatorName = formatQualityActorName(formula.operator)
                return (
                  <TableRow
                    key={formula.id}
                    className='group h-16 cursor-pointer border-b border-dashed border-muted/50 transition-all hover:bg-white/80'
                  >
                    <TableCell className='pl-8 text-center font-mono text-[10px] text-muted-foreground/40'>
                      {index + 1}
                    </TableCell>
                    <TableCell className='text-sm font-bold tracking-tight text-slate-700'>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600'>
                          <Calculator className='size-4' />
                        </div>
                        <span className='max-w-[240px] truncate'>
                          {formula.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className='rounded border border-muted-foreground/10 bg-muted/30 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-primary'>
                        {formula.formula}
                      </code>
                    </TableCell>
                    <TableCell className='text-center'>
                      <div className='flex items-center justify-center'>
                        <div
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                            normalizeFormulaStatus(formula.status) ===
                            'DISABLED'
                              ? 'border border-slate-500/10 bg-slate-500/5'
                              : 'border border-emerald-500/10 bg-emerald-500/5'
                          }`}
                        >
                          <div
                            className={`size-1 rounded-full ${
                              normalizeFormulaStatus(formula.status) ===
                              'DISABLED'
                                ? 'bg-slate-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-black uppercase italic ${
                              normalizeFormulaStatus(formula.status) ===
                              'DISABLED'
                                ? 'text-slate-500'
                                : 'text-emerald-600'
                            }`}
                          >
                            {getFormulaStatusLabel(t, formula.status)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <User className='size-3 text-muted-foreground/30' />
                        <span className='text-[10px] font-black uppercase'>
                          {operatorName || t('quality.common.system')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Clock className='size-3 text-muted-foreground/30' />
                        <span className='font-mono text-[10px] text-muted-foreground/50'>
                          {formula.operateTime}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='block max-w-[180px] truncate text-[10px] text-muted-foreground/60'>
                        {formula.remarks}
                      </span>
                    </TableCell>
                    <TableCell className='pr-8 text-right'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-xl group-hover:bg-primary/10 group-hover:text-primary'
                      >
                        <Edit2 className='size-3.5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
