import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Plus,
  Calculator,
  Edit2,
  Clock,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import type { InspectionFormula } from '../data/schema'
import { formatQualityActorName } from '../utils/quality-utils'

function normalizeFormulaStatus(status?: string) {
  const normalized = status?.toUpperCase()
  if (status === '停用' || normalized === 'DISABLED') return 'DISABLED'
  if (status === '正常' || normalized === 'NORMAL') return 'NORMAL'
  return 'UNKNOWN'
}

function getFormulaStatusLabel(t: ReturnType<typeof useLanguage>['t'], status?: string) {
  const normalized = normalizeFormulaStatus(status)
  if (normalized === 'DISABLED') return t('quality.formulas.table.disabled')
  if (normalized === 'NORMAL') return t('quality.formulas.table.normal')
  return status || t('quality.common.unknown')
}

export function QualityFormulas() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const formulas: InspectionFormula[] = []

  const filteredFormulas = formulas.filter((formula) =>
    formula.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formula.formula.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <PageHeader
        icon={Calculator}
        title={t('quality.formulas.page.title')}
        description={t('quality.formulas.page.description')}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">{t('quality.formulas.page.registered')}</span>
              <div className='flex items-baseline gap-1'>
                <span className="text-2xl font-black text-primary tracking-tighter italic tabular-nums">{formulas.length}</span>
                <span className='text-[10px] font-black opacity-20'>{t('quality.formulas.page.algorithms')}</span>
              </div>
            </div>
            <div className="w-px h-8 bg-muted-foreground/10 border-l border-dashed" />
          </div>

          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t('quality.formulas.page.searchPlaceholder')}
              className="h-12 w-full sm:w-[320px] lg:w-[380px] pl-11 rounded-2xl bg-muted/50 border-none shadow-inner text-[11px] font-bold uppercase tracking-tight focus:bg-background transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size='sm'
            className="h-11 flex-1 sm:flex-initial px-6 rounded-full bg-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
          >
            <Plus className="size-4" />
            {t('quality.formulas.page.add')}
          </Button>
        </div>
      </div>

      <div className="relative rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 overflow-hidden shadow-inner flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none" />
        <div className='overflow-x-auto'>
          <Table className="min-w-[1200px] border-separate border-spacing-y-0">
            <TableHeader className="bg-muted/40 sticky top-0 z-10">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="w-[60px] text-[9px] font-black uppercase tracking-widest text-center pl-8 py-5">{t('quality.formulas.table.no')}</TableHead>
                <TableHead className="w-[300px] text-[9px] font-black uppercase tracking-widest italic py-5">{t('quality.formulas.table.name')}</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest italic py-5">{t('quality.formulas.table.logic')}</TableHead>
                <TableHead className="w-[100px] text-[9px] font-black uppercase tracking-widest italic text-center py-5">{t('quality.formulas.table.status')}</TableHead>
                <TableHead className="w-[120px] text-[9px] font-black uppercase tracking-widest italic py-5">{t('quality.formulas.table.operator')}</TableHead>
                <TableHead className="w-[180px] text-[9px] font-black uppercase tracking-widest italic py-5">{t('quality.formulas.table.operateTime')}</TableHead>
                <TableHead className="w-[200px] text-[9px] font-black uppercase tracking-widest italic py-5">{t('quality.formulas.table.remarks')}</TableHead>
                <TableHead className="w-[80px] text-[9px] font-black uppercase tracking-widest italic pr-8 text-right py-5 flex items-center justify-end">{t('quality.formulas.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFormulas.map((formula, index) => {
                const operatorName = formatQualityActorName(formula.operator)
                return (
                <TableRow
                  key={formula.id}
                  className="group border-b border-dashed border-muted/50 hover:bg-white/80 cursor-pointer transition-all h-16"
                >
                  <TableCell className="text-center font-mono text-[10px] text-muted-foreground/40 pl-8">{index + 1}</TableCell>
                  <TableCell className="font-bold text-sm tracking-tight text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                        <Calculator className="size-4" />
                      </div>
                      <span className="truncate max-w-[240px]">{formula.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-[11px] font-mono bg-muted/30 px-2 py-1 rounded border border-muted-foreground/10 text-primary whitespace-nowrap">
                      {formula.formula}
                    </code>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                          normalizeFormulaStatus(formula.status) === 'DISABLED'
                            ? 'bg-slate-500/5 border border-slate-500/10'
                            : 'bg-emerald-500/5 border border-emerald-500/10'
                        }`}
                      >
                        <div
                          className={`size-1 rounded-full ${
                            normalizeFormulaStatus(formula.status) === 'DISABLED' ? 'bg-slate-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`text-[9px] font-black uppercase italic ${
                            normalizeFormulaStatus(formula.status) === 'DISABLED' ? 'text-slate-500' : 'text-emerald-600'
                          }`}
                        >
                          {getFormulaStatusLabel(t, formula.status)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="size-3 text-muted-foreground/30" />
                      <span className="text-[10px] font-black uppercase">{operatorName || t('quality.common.system')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="size-3 text-muted-foreground/30" />
                      <span className="text-[10px] font-mono text-muted-foreground/50">{formula.operateTime}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-[180px] block">{formula.remarks}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" size="icon" className="size-8 rounded-xl group-hover:bg-primary/10 group-hover:text-primary">
                      <Edit2 className="size-3.5" />
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
