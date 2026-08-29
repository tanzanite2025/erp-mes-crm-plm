import { useMemo, useRef, useState, type ReactNode, type Ref } from 'react'
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Printer,
  Table2,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { cn } from '@/lib/utils'
import type { AppLocale } from '@/locales'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IndustrialHeader } from '@/components/uds/industrial-header'

type MonthlySummaryCopy = {
  title: string
  description: string
  statusBadge: string
  libraryTitle: string
  librarySubtitle: string
  templateType: string
  ownerDepartments: string
  paperSpec: string
  print: string
  previewTitle: string
  pageMeta: string
  emptyCell: string
  sheet: {
    title: string
    sequence: string
    workItem: string
    unitPrice: string
    previousMonth: string
    currentMonthTotal: string
    pieceworkAmount: string
    month: string
    staff: string
    section: string
    quantityTotal: string
    midShiftDays: string
    nightShiftDays: string
    approvedBy: string
    reviewedBy: string
    operator: string
  }
}

type LocalizedText = Record<AppLocale, string>

type PieceworkFormTemplateDefinition = {
  id: string
  code: string
  category: LocalizedText
  title: LocalizedText
  scenario: LocalizedText
  departments: LocalizedText
  paper: string
  rows: number
}

type PieceworkFormTemplate = Omit<
  PieceworkFormTemplateDefinition,
  'category' | 'title' | 'scenario' | 'departments'
> & {
  category: string
  title: string
  scenario: string
  departments: string
}

const copyByLocale: Record<AppLocale, MonthlySummaryCopy> = {
  'zh-CN': {
    title: '计件表格模板',
    description: '统一承接各部门纸面填写、打印留档与后续录入核对的计件表格。',
    statusBadge: '模板受控',
    libraryTitle: '模板库',
    librarySubtitle: '按表格类型集中维护',
    templateType: '模板类型',
    ownerDepartments: '适用部门',
    paperSpec: '纸张规格',
    print: '打印模板',
    previewTitle: '打印预览',
    pageMeta: '计件管理 / 表格模板',
    emptyCell: ' ',
    sheet: {
      title: '成型产量汇总表',
      sequence: '序号',
      workItem: '作业项目',
      unitPrice: '单价',
      previousMonth: '上月',
      currentMonthTotal: '本月合计',
      pieceworkAmount: '计件金额',
      month: '月份',
      staff: '姓名',
      section: '班组',
      quantityTotal: '数量合计',
      midShiftDays: '中班（天数）',
      nightShiftDays: '夜班（天数）',
      approvedBy: '核准',
      reviewedBy: '审核',
      operator: '作业员',
    },
  },
  'en-US': {
    title: 'Piecework Form Templates',
    description:
      'Central form templates for paper capture, departmental signoff, and later entry reconciliation.',
    statusBadge: 'Controlled',
    libraryTitle: 'Template Library',
    librarySubtitle: 'Managed by form type',
    templateType: 'Template Type',
    ownerDepartments: 'Departments',
    paperSpec: 'Paper',
    print: 'Print Template',
    previewTitle: 'Print Preview',
    pageMeta: 'Piecework / Form Templates',
    emptyCell: ' ',
    sheet: {
      title: 'Molding Output Summary',
      sequence: 'No.',
      workItem: 'Work Item',
      unitPrice: 'Rate',
      previousMonth: 'Prev.',
      currentMonthTotal: 'Monthly Total',
      pieceworkAmount: 'Piecework Amount',
      month: 'Month',
      staff: 'Name',
      section: 'Team',
      quantityTotal: 'Quantity Total',
      midShiftDays: 'Mid Shift (Days)',
      nightShiftDays: 'Night Shift (Days)',
      approvedBy: 'Approved',
      reviewedBy: 'Reviewed',
      operator: 'Operator',
    },
  },
}

const pieceworkFormTemplateDefinitions: PieceworkFormTemplateDefinition[] = [
  {
    id: 'molding-output-summary',
    code: 'PW-FM-001',
    category: {
      'zh-CN': '成型产量汇总表',
      'en-US': 'Molding Output Summary Form',
    },
    title: {
      'zh-CN': '成型产量汇总表',
      'en-US': 'Molding Output Summary Form',
    },
    scenario: {
      'zh-CN': '按月份汇总每日成型产量',
      'en-US': 'Monthly daily molding output summary',
    },
    departments: {
      'zh-CN': '成型 / 计件核算',
      'en-US': 'Molding / Piecework Accounting',
    },
    paper: 'A4 Landscape',
    rows: 20,
  },
]

const dayColumns = Array.from({ length: 31 }, (_, index) => index + 1)

export function PieceworkTemplates() {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]
  const templates = useMemo(
    () =>
      pieceworkFormTemplateDefinitions.map((template) => ({
        ...template,
        category: template.category[locale],
        title: template.title[locale],
        scenario: template.scenario[locale],
        departments: template.departments[locale],
      })),
    [locale]
  )
  const printRef = useRef<HTMLDivElement>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    pieceworkFormTemplateDefinitions[0].id
  )

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => template.id === selectedTemplateId) ??
      templates[0],
    [selectedTemplateId, templates]
  )

  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${selectedTemplate.code}-${selectedTemplate.title}`,
  })

  return (
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={FileSpreadsheet}
        title={copy.title}
        description={copy.description}
        gradient
        innerClassName='text-cyan-700'
        className='border-muted-foreground/10'
        statusBadge={
          <div className='flex w-fit items-center gap-3 rounded-full border border-cyan-500/15 bg-cyan-500/8 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-cyan-700/70 uppercase'>
              {copy.statusBadge}
            </span>
            <CheckCircle2 className='size-3.5 text-cyan-600' />
          </div>
        }
      />

      <div className='grid min-w-0 gap-6 2xl:grid-cols-[320px_minmax(0,1fr)]'>
        <aside className='space-y-4'>
          <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-5'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700'>
                <Table2 className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='truncate text-sm font-black tracking-tight'>
                  {copy.libraryTitle}
                </div>
                <div className='text-[10px] font-black tracking-[0.22em] text-muted-foreground/60 uppercase'>
                  {copy.librarySubtitle}
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              {templates.map((template) => {
                const selected = template.id === selectedTemplate.id
                return (
                  <button
                    key={template.id}
                    type='button'
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-colors',
                      selected
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-900 dark:text-cyan-100'
                        : 'border-dashed border-muted/50 bg-background/70 hover:bg-muted/20'
                    )}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='truncate text-sm font-black'>
                          {template.title}
                        </div>
                        <div className='mt-1 font-mono text-[10px] font-black tracking-[0.16em] text-muted-foreground/70 uppercase'>
                          {template.code}
                        </div>
                      </div>
                    </div>
                    <div className='mt-3 grid gap-2 text-[11px] font-semibold text-muted-foreground'>
                      <div className='flex items-center gap-2'>
                        <ClipboardList className='size-3.5' />
                        <span className='truncate'>{template.scenario}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Building2 className='size-3.5' />
                        <span className='truncate'>
                          {template.departments}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className='rounded-2xl border border-dashed border-muted/50 bg-background p-5'>
            <div className='space-y-3'>
              <TemplateMetaItem
                label={copy.templateType}
                value={selectedTemplate.category}
              />
              <TemplateMetaItem
                label={copy.ownerDepartments}
                value={selectedTemplate.departments}
              />
              <TemplateMetaItem
                label={copy.paperSpec}
                value={selectedTemplate.paper}
              />
            </div>
          </div>
        </aside>

        <section className='min-w-0 space-y-4'>
          <div className='flex flex-col gap-3 rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-5 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge
                  variant='outline'
                  className='rounded-full px-3 py-1 text-[10px] font-black tracking-[0.16em] uppercase'
                >
                  {copy.pageMeta}
                </Badge>
                <Badge className='border-none bg-cyan-500/10 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-cyan-700 uppercase'>
                  {selectedTemplate.code}
                </Badge>
              </div>
              <div className='mt-3 text-base font-black tracking-tight'>
                {copy.previewTitle} - {selectedTemplate.title}
              </div>
            </div>
            <Button
              onClick={() => void reactToPrint()}
              className='h-11 gap-2 rounded-full bg-cyan-700 px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-cyan-700/20 hover:bg-cyan-800'
            >
              <Printer className='size-4' />
              {copy.print}
            </Button>
          </div>

          <div className='min-w-0 overflow-x-auto rounded-2xl border border-dashed border-muted/50 bg-slate-100/80 p-4 dark:bg-slate-950/60'>
            <MoldingOutputSummarySheet
              ref={printRef}
              copy={copy}
              template={selectedTemplate}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function TemplateMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase'>
        {label}
      </div>
      <div className='mt-1 text-sm font-black text-foreground'>{value}</div>
    </div>
  )
}

function MoldingOutputSummarySheet({
  copy,
  template,
  ref,
}: {
  copy: MonthlySummaryCopy
  template: PieceworkFormTemplate
  ref: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      className='piecework-template-print-root mx-auto min-h-[210mm] w-[297mm] bg-white p-[7mm] text-black shadow-xl shadow-slate-900/10'
    >
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 7mm;
            }
            body {
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .piecework-template-print-root {
              width: 283mm !important;
              min-height: 196mm !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
            }
            .piecework-template-print-root table {
              break-inside: auto;
            }
            .piecework-template-print-root tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className='font-["Microsoft_YaHei",Arial,sans-serif]'>
        <div className='mb-1 flex min-h-7 items-end justify-center'>
          <div className='text-[18px] leading-none font-black'>
            {copy.sheet.title}
          </div>
        </div>

        <div className='mb-1 grid grid-cols-3 gap-6 text-[9px] font-bold'>
          <div>
            {copy.sheet.month}: <span className='inline-block w-24 border-b border-black' />
          </div>
          <div>
            {copy.sheet.staff}: <span className='inline-block w-24 border-b border-black' />
          </div>
          <div>
            {copy.sheet.section}: <span className='inline-block w-24 border-b border-black' />
          </div>
        </div>

        <table className='w-full table-fixed border-collapse text-center text-[7.5px] leading-tight'>
          <colgroup>
            <col style={{ width: '8mm' }} />
            <col style={{ width: '22mm' }} />
            <col style={{ width: '10mm' }} />
            <col style={{ width: '9mm' }} />
            {dayColumns.map((day) => (
              <col key={day} style={{ width: '6.2mm' }} />
            ))}
            <col style={{ width: '15mm' }} />
            <col style={{ width: '18mm' }} />
          </colgroup>
          <thead>
            <tr className='h-[7mm]'>
              <SheetHeaderCell>{copy.sheet.sequence}</SheetHeaderCell>
              <SheetHeaderCell>{copy.sheet.workItem}</SheetHeaderCell>
              <SheetHeaderCell>{copy.sheet.unitPrice}</SheetHeaderCell>
              <SheetHeaderCell>{copy.sheet.previousMonth}</SheetHeaderCell>
              {dayColumns.map((day) => (
                <SheetHeaderCell key={day}>{day}</SheetHeaderCell>
              ))}
              <SheetHeaderCell>{copy.sheet.currentMonthTotal}</SheetHeaderCell>
              <SheetHeaderCell>{copy.sheet.pieceworkAmount}</SheetHeaderCell>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: template.rows }, (_, index) => (
              <tr key={index} className='h-[7.7mm]'>
                <SheetBodyCell className='font-mono'>{index + 1}</SheetBodyCell>
                <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
                <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
                <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
                {dayColumns.map((day) => (
                  <SheetBodyCell key={day}>{copy.emptyCell}</SheetBodyCell>
                ))}
                <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
                <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
              </tr>
            ))}
            <tr className='h-[7.7mm]'>
              <SheetBodyCell className='font-mono'>
                {template.rows + 1}
              </SheetBodyCell>
              <SheetBodyCell className='font-black'>
                {copy.sheet.quantityTotal}
              </SheetBodyCell>
              <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
              <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
              {dayColumns.map((day) => (
                <SheetBodyCell key={day}>{copy.emptyCell}</SheetBodyCell>
              ))}
              <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
              <SheetBodyCell>{copy.emptyCell}</SheetBodyCell>
            </tr>
          </tbody>
        </table>

        <div className='mt-2 grid grid-cols-[1.15fr_1.15fr_1fr_1fr_1fr] gap-4 text-[9px] font-bold'>
          <SignatureLine label={copy.sheet.midShiftDays} />
          <SignatureLine label={copy.sheet.nightShiftDays} />
          <SignatureLine label={copy.sheet.approvedBy} />
          <SignatureLine label={copy.sheet.reviewedBy} />
          <SignatureLine label={copy.sheet.operator} />
        </div>
      </div>
    </div>
  )
}

function SheetHeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className='border border-black px-0.5 py-1 align-middle font-black text-black'>
      {children}
    </th>
  )
}

function SheetBodyCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={cn('border border-black px-0.5 align-middle', className)}>
      {children}
    </td>
  )
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className='min-w-0 whitespace-nowrap'>
      {label}: <span className='inline-block w-20 border-b border-black' />
    </div>
  )
}
