/**
 * 切料计划编辑器(裁布料模板配置)。
 *
 * 业务背景: 纤维 / 复合材料生产中,从一卷预浸料按"切料计划"切成多种尺寸,
 * 计划包含切料 spec 配置 + 与产品/树脂模型的匹配关系。
 *
 * 主要能力:
 *   - 编辑切料计划基本信息 + 多行明细
 *   - 自动匹配现有产品(findMatchedProduct,基于规格名称归一化匹配)
 *   - 树脂型号识别(tryExtractResinModel,从 spec 字符串提取)
 *   - 切料尺寸单位下拉(getCutSizeOptionLabel)
 *
 * 共用辅助子组件 EditorField/LineInput/ReadonlyLineValue 在文件末尾,集中维护行级 UI。
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { isValid, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { formatEngineeringDateProtocol } from '@/lib/codecs/code-normalization'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveHoleCodeSource } from '@/features/code-center/hooks/use-hole-code-source'
import type { Product } from '@/features/engineering/data/schema'
import { useProductDisplayOptions } from '@/features/engineering/hooks/use-product-display-options'
import { type CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { formatCutSizeExpression } from '@/features/raw-materials/cut-size-library/domain/cut-size-geometry'
import { CutSizeLibraryService } from '@/features/raw-materials/cut-size-library/services/cut-size-library-service'
import type {
  PrepregMaterialSpec,
  PrepregMaterialSpecListResponse,
} from '@/features/raw-materials/data/prepreg-material-spec-schema'
import { PrepregMaterialSpecService } from '@/features/raw-materials/services/prepreg-material-spec-service'
import {
  buildCuttingPlanName,
  syncCuttingPlanLineWithCutSizeUnit,
  createEmptyCuttingPlanLine,
  EMPTY_CUTTING_PLAN_LINE_CONSTRAINT_PROFILE,
  type CuttingPlanInput,
  type CuttingPlanStatus,
} from '../data/cutting-plan-schema'

interface CuttingPlanEditorProps {
  value: CuttingPlanInput
  onChange: (value: CuttingPlanInput) => void
}

type PlanField = Exclude<keyof CuttingPlanInput, 'lines'>
type PlanLine = CuttingPlanInput['lines'][number]

const PREPREG_SPECS_QUERY_KEY = [
  'raw-materials',
  'prepreg-specs',
  'active-options',
] as const
const CUT_SIZE_OPTIONS_QUERY_KEY = [
  'raw-materials',
  'cut-size-library',
  'active-options',
] as const

function formatPercent(value: string): string {
  const text = value.trim()
  if (!text) return ''
  return text.endsWith('%') ? text : `${text}%`
}

function tryExtractResinModel(spec: PrepregMaterialSpec): string {
  const source = `${spec.description || ''} ${spec.name || ''}`.trim()
  if (!source) return ''
  const matched = source.match(
    /(?:树脂型号|Resin(?:\s*Model)?)[:：\s]*([^\s,，;；]+)/i
  )
  return matched?.[1]?.trim() || ''
}

function getPrepregLabel(spec: PrepregMaterialSpec): string {
  const rc = formatPercent(spec.resinContentPercent)
  const displayPart = spec.displayAlias?.trim() || ''
  const namePart = spec.name || '--'
  const codePart = spec.code || spec.supplierProductCode || '--'
  const base = displayPart || `${codePart} | ${namePart}`
  return rc ? `${base} | RC ${rc}` : base
}

function normalizeMatchText(value?: string): string {
  return value?.trim().toLowerCase() || ''
}

function findMatchedProduct(
  products: Product[],
  productCode?: string,
  productName?: string
): Product | undefined {
  const normalizedCode = normalizeMatchText(productCode)
  const normalizedName = normalizeMatchText(productName)
  if (!normalizedCode && !normalizedName) return undefined

  return (
    products.find((product) => {
      const codeMatched =
        normalizedCode && normalizeMatchText(product.sku) === normalizedCode
      const nameMatched =
        normalizedName && normalizeMatchText(product.name) === normalizedName
      return Boolean(codeMatched && nameMatched)
    }) ||
    products.find(
      (product) =>
        normalizedCode && normalizeMatchText(product.sku) === normalizedCode
    ) ||
    products.find(
      (product) =>
        normalizedName && normalizeMatchText(product.name) === normalizedName
    )
  )
}

function getCutSizeOptionLabel(item: CutSizeUnit): string {
  const expression = formatCutSizeExpression(item)
  return expression
    ? `${item.code} | ${item.name} | ${expression}`
    : `${item.code} | ${item.name}`
}

function parseDateInput(value?: string): Date | undefined {
  if (!value?.trim()) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}

function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function CuttingPlanEditor({ value, onChange }: CuttingPlanEditorProps) {
  const { t } = useLanguage()
  const { products = [], productOptions } = useProductDisplayOptions()
  const { countOptions } = useActiveHoleCodeSource()

  const prepregQuery = useQuery<
    PrepregMaterialSpec[] | PrepregMaterialSpecListResponse
  >({
    queryKey: PREPREG_SPECS_QUERY_KEY,
    queryFn: async () => {
      const response = await PrepregMaterialSpecService.list('', 1, 200)
      return response.items.filter((item) => item.status === 'Active')
    },
    staleTime: 5 * 60 * 1000,
  })

  const cutSizeQuery = useQuery({
    queryKey: CUT_SIZE_OPTIONS_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })

  const prepregSpecs = useMemo(() => {
    if (Array.isArray(prepregQuery.data)) return prepregQuery.data
    if (Array.isArray(prepregQuery.data?.items)) {
      return prepregQuery.data.items.filter((item) => item.status === 'Active')
    }
    return []
  }, [prepregQuery.data])

  const cutSizeUnits = useMemo(
    () => cutSizeQuery.data ?? [],
    [cutSizeQuery.data]
  )

  const activeProducts = useMemo(
    () =>
      products.filter((product) => (product.status ?? 'Active') !== 'Archived'),
    [products]
  )
  const activeProductIdSet = useMemo(
    () => new Set(activeProducts.map((product) => product.id)),
    [activeProducts]
  )
  const activeProductOptions = useMemo(
    () =>
      productOptions.filter((option) => activeProductIdSet.has(option.value)),
    [activeProductIdSet, productOptions]
  )

  const matchedProduct = useMemo(
    () =>
      findMatchedProduct(activeProducts, value.productCode, value.productName),
    [activeProducts, value.productCode, value.productName]
  )

  const generatedName = useMemo(
    () =>
      buildCuttingPlanName({
        productName: value.productName,
        productCode: value.productCode,
        holeCount: value.holeCount,
      }),
    [value.productCode, value.productName, value.holeCount]
  )
  const selectedEffectiveDate = useMemo(
    () => parseDateInput(value.effectiveDate),
    [value.effectiveDate]
  )

  const selectedPrepregSummary = useMemo(() => {
    if (!value.prepregSpecId) return ''
    const spec = prepregSpecs.find((item) => item.id === value.prepregSpecId)
    if (!spec) return value.prepregSpecLabel || ''

    const parts = [
      spec.fiberModel?.trim(),
      tryExtractResinModel(spec),
      formatPercent(spec.resinContentPercent),
    ].filter(Boolean)

    return parts.length > 0 ? parts.join(' / ') : getPrepregLabel(spec)
  }, [prepregSpecs, value.prepregSpecId, value.prepregSpecLabel])

  useEffect(() => {
    if (value.name === generatedName) return
    onChange({ ...value, name: generatedName })
  }, [generatedName, onChange, value])

  useEffect(() => {
    if (!matchedProduct || value.productId === matchedProduct.id) return
    onChange({
      ...value,
      productId: matchedProduct.id,
      productCode: matchedProduct.sku || '',
      productName: matchedProduct.name || '',
    })
  }, [matchedProduct, onChange, value])

  const lines = useMemo(() => value.lines ?? [], [value.lines])

  useEffect(() => {
    if (lines.length === 0 || cutSizeUnits.length === 0) return

    const nextLines = lines.map((line) =>
      syncCuttingPlanLineWithCutSizeUnit(
        line,
        cutSizeUnits.find((item) => item.id === line.cutSizeId) || null
      )
    )

    const hasAuthorityDrift = nextLines.some((nextLine, index) => {
      const currentLine = lines[index]
      return (
        nextLine.cutSizeCode !== currentLine.cutSizeCode ||
        nextLine.cutSizeName !== currentLine.cutSizeName ||
        nextLine.sizeExpression !== currentLine.sizeExpression ||
        nextLine.faw !== currentLine.faw ||
        nextLine.weightG !== currentLine.weightG ||
        nextLine.areaM2 !== currentLine.areaM2
      )
    })

    if (!hasAuthorityDrift) return
    onChange({ ...value, lines: nextLines })
  }, [cutSizeUnits, lines, onChange, value])

  const updateField = <K extends PlanField>(
    field: K,
    nextValue: CuttingPlanInput[K]
  ) => {
    onChange({ ...value, [field]: nextValue })
  }

  const updateProduct = (productId: string) => {
    const product = activeProducts.find((item) => item.id === productId)
    onChange({
      ...value,
      productId,
      productCode: product?.sku || '',
      productName: product?.name || '',
    })
  }

  const updatePrepreg = (prepregSpecId: string) => {
    const spec = prepregSpecs.find((item) => item.id === prepregSpecId)
    if (!spec) {
      onChange({
        ...value,
        prepregSpecId: '',
        prepregSpecLabel: '',
        carbonFiberModel: '',
        resinContentPercent: '',
        resinModel: '',
      })
      return
    }

    onChange({
      ...value,
      prepregSpecId,
      prepregSpecLabel: getPrepregLabel(spec),
      carbonFiberModel: spec.fiberModel || '',
      resinContentPercent: formatPercent(spec.resinContentPercent),
      resinModel: tryExtractResinModel(spec),
    })
  }

  const updateLine = (index: number, patch: Partial<PlanLine>) => {
    const nextLines = lines.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line
    )
    onChange({ ...value, lines: nextLines })
  }

  const updateLineTextField = (
    index: number,
    field: keyof PlanLine,
    nextValue: string
  ) => {
    updateLine(index, { [field]: nextValue })
  }

  const updateLineBooleanField = (
    index: number,
    field: 'mustFulfill' | 'allowMixedPlan' | 'manualGroupBreakBefore',
    nextValue: boolean
  ) => {
    updateLine(index, { [field]: nextValue })
  }

  const updateLineConstraintProfileField = (
    index: number,
    field:
      | 'rollGroupKey'
      | 'orderSequence'
      | 'yarnDirectionMode'
      | 'processTags'
      | 'noteKeywords',
    nextValue: string
  ) => {
    const current =
      lines[index]?.constraintProfile ||
      EMPTY_CUTTING_PLAN_LINE_CONSTRAINT_PROFILE
    updateLine(index, {
      constraintProfile: {
        ...EMPTY_CUTTING_PLAN_LINE_CONSTRAINT_PROFILE,
        ...current,
        [field]:
          field === 'processTags' || field === 'noteKeywords'
            ? parseCommaSeparatedList(nextValue)
            : nextValue,
      },
    })
  }

  const updateLineCutSize = (index: number, cutSizeId: string) => {
    const unit = cutSizeUnits.find((item) => item.id === cutSizeId)
    if (!unit) {
      updateLine(index, {
        cutSizeId: '',
        cutSizeCode: '',
        cutSizeName: '',
      })
      return
    }
    updateLine(index, syncCuttingPlanLineWithCutSizeUnit(lines[index], unit))
  }

  const addLine = () => {
    onChange({
      ...value,
      lines: [...lines, createEmptyCuttingPlanLine(lines.length + 1)],
    })
  }

  const removeLine = (index: number) => {
    onChange({
      ...value,
      lines: lines
        .filter((_, lineIndex) => lineIndex !== index)
        .map((line, lineIndex) => ({ ...line, sequenceNo: lineIndex + 1 })),
    })
  }

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-12 [&_input]:h-10 [&_input]:rounded-2xl'>
        <EditorField
          label={t('engineering.cuttingPlan.fields.planName')}
          required
          className='xl:col-span-3'
        >
          <Input
            value={value.name}
            readOnly
            placeholder={t(
              'engineering.cuttingPlan.placeholders.generatedName'
            )}
            className='bg-muted/15'
          />
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.productModel')}
          required
          className='xl:col-span-3'
        >
          <Select
            value={value.productId || undefined}
            onValueChange={updateProduct}
          >
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue
                placeholder={t(
                  'engineering.cuttingPlan.placeholders.selectProduct'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {activeProductOptions.map((productOption) => (
                <SelectItem
                  key={productOption.value}
                  value={productOption.value}
                >
                  {productOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.holeCount')}
          required
          className='xl:col-span-2'
        >
          <Select
            value={value.holeCount || undefined}
            onValueChange={(nextValue) => updateField('holeCount', nextValue)}
          >
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue
                placeholder={t(
                  'engineering.cuttingPlan.placeholders.selectHoleCount'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {countOptions.map((count) => (
                <SelectItem key={count} value={count}>
                  {count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.documentNo')}
          className='xl:col-span-2'
        >
          <Input
            value={value.documentNo}
            onChange={(event) => updateField('documentNo', event.target.value)}
            placeholder={t('engineering.cuttingPlan.placeholders.documentNo')}
          />
        </EditorField>

        <EditorField
          label={t('engineering.cuttingPlan.fields.revisionNo')}
          className='xl:col-span-2'
        >
          <Input
            value={value.revisionNo}
            onChange={(event) => updateField('revisionNo', event.target.value)}
            placeholder={t('engineering.cuttingPlan.placeholders.revisionNo')}
          />
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.status')}
          className='xl:col-span-2'
        >
          <Select
            value={value.status}
            onValueChange={(nextValue) =>
              updateField('status', nextValue as CuttingPlanStatus)
            }
          >
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Draft'>
                {t('engineering.cuttingPlan.status.draft')}
              </SelectItem>
              <SelectItem value='Active'>
                {t('engineering.cuttingPlan.status.active')}
              </SelectItem>
              <SelectItem value='Archived'>
                {t('engineering.cuttingPlan.status.archived')}
              </SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.effectiveDate')}
          className='xl:col-span-3'
        >
          <div className='flex items-center gap-1.5'>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  className='h-10 w-full justify-start rounded-2xl px-3 text-left text-sm font-semibold'
                >
                  {selectedEffectiveDate ? (
                    formatEngineeringDateProtocol(selectedEffectiveDate)
                  ) : (
                    <span className='text-muted-foreground'>
                      {t(
                        'engineering.cuttingPlan.placeholders.selectEffectiveDate'
                      )}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={selectedEffectiveDate}
                  onSelect={(nextDate) =>
                    updateField(
                      'effectiveDate',
                      nextDate ? formatEngineeringDateProtocol(nextDate) : ''
                    )
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedEffectiveDate ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground'
                onClick={() => updateField('effectiveDate', '')}
                aria-label={t(
                  'engineering.cuttingPlan.accessibility.clearEffectiveDate'
                )}
              >
                <X className='size-4' />
              </Button>
            ) : null}
          </div>
        </EditorField>
        <EditorField
          label={t('engineering.cuttingPlan.fields.prepregRef')}
          className='xl:col-span-5'
        >
          <div className='space-y-1.5'>
            <Select
              value={value.prepregSpecId || undefined}
              onValueChange={updatePrepreg}
            >
              <SelectTrigger className='h-10 w-full rounded-2xl'>
                <SelectValue
                  placeholder={
                    prepregQuery.isLoading
                      ? t('engineering.cuttingPlan.placeholders.loadingPrepreg')
                      : t('engineering.cuttingPlan.placeholders.selectPrepreg')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {prepregSpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {getPrepregLabel(spec)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='min-h-5 px-1 text-[11px] leading-5 font-semibold text-muted-foreground'>
              {selectedPrepregSummary ||
                t(
                  'engineering.cuttingPlan.placeholders.prepregSummaryFallback'
                )}
            </p>
          </div>
        </EditorField>
      </div>

      <div className='rounded-2xl border border-dashed border-muted-foreground/20 bg-background'>
        <div className='flex flex-col gap-2 border-b border-dashed border-muted-foreground/20 p-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <div className='text-sm font-black'>
              {t('engineering.cuttingPlan.fields.lineDetails')}
            </div>
            <div className='text-[11px] font-semibold text-muted-foreground'>
              {t('engineering.cuttingPlan.fields.lineDetailsHint')}
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={addLine}
            className='h-8 rounded-full text-xs font-black'
          >
            <Plus className='size-3.5' />
            {t('engineering.cuttingPlan.actions.addLine')}
          </Button>
        </div>

        <div className='overflow-x-auto overscroll-x-contain rounded-b-2xl'>
          <Table className='min-w-[1200px]'>
            <TableHeader>
              <TableRow className='bg-muted/30'>
                <TableHead className='w-12 text-center text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.sequenceNo')}
                </TableHead>
                <TableHead className='min-w-28 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.rollOrder')}
                </TableHead>
                <TableHead className='min-w-24 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.yarnDirection')}
                </TableHead>
                <TableHead className='min-w-52 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.cutSizeLibrary')}
                </TableHead>
                <TableHead className='min-w-24 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.sizeExpression')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.requiredSets')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.priority')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.mustFulfill')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.allowMixedPlan')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.faw')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.weight')}
                </TableHead>
                <TableHead className='min-w-20 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.areaM2')}
                </TableHead>
                <TableHead className='min-w-72 text-[10px] font-black'>
                  {t('engineering.cuttingPlan.fields.operationNote')}
                </TableHead>
                <TableHead className='w-12 text-right' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={14}
                    className='h-24 text-center text-xs font-bold text-muted-foreground'
                  >
                    {t('engineering.cuttingPlan.empty.noLines')}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, index) => (
                  <TableRow key={line.id}>
                    <TableCell className='text-center text-xs font-black'>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className='grid min-w-0 gap-1.5'>
                        <LineInput
                          value={line.rollOrder}
                          onChange={(nextValue) =>
                            updateLineTextField(index, 'rollOrder', nextValue)
                          }
                        />
                        <LineInput
                          value={line.constraintProfile?.rollGroupKey}
                          onChange={(nextValue) =>
                            updateLineConstraintProfileField(
                              index,
                              'rollGroupKey',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.rollGroupKey'
                          )}
                        />
                        <LineInput
                          value={line.constraintProfile?.orderSequence}
                          onChange={(nextValue) =>
                            updateLineConstraintProfileField(
                              index,
                              'orderSequence',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.orderSequence'
                          )}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='grid min-w-0 gap-1.5'>
                        <LineInput
                          value={line.yarnDirection}
                          onChange={(nextValue) =>
                            updateLineTextField(
                              index,
                              'yarnDirection',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.yarnDirection'
                          )}
                        />
                        <LineInput
                          value={line.constraintProfile?.yarnDirectionMode}
                          onChange={(nextValue) =>
                            updateLineConstraintProfileField(
                              index,
                              'yarnDirectionMode',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.yarnDirectionMode'
                          )}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.cutSizeId || undefined}
                        onValueChange={(nextValue) =>
                          updateLineCutSize(index, nextValue)
                        }
                      >
                        <SelectTrigger className='h-8 rounded-lg border-muted/60 bg-background text-xs font-semibold'>
                          <SelectValue
                            placeholder={
                              cutSizeQuery.isLoading
                                ? t(
                                    'engineering.cuttingPlan.placeholders.cutSizeLoading'
                                  )
                                : t(
                                    'engineering.cuttingPlan.placeholders.selectCutSize'
                                  )
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {cutSizeUnits.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {getCutSizeOptionLabel(item)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <ReadonlyLineValue
                        value={line.sizeExpression}
                        placeholder={t(
                          'engineering.cuttingPlan.placeholders.sizeExpression'
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <LineInput
                        value={line.requiredSets}
                        onChange={(nextValue) =>
                          updateLineTextField(index, 'requiredSets', nextValue)
                        }
                        placeholder={t(
                          'engineering.cuttingPlan.placeholders.requiredSets'
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <LineInput
                        value={line.priority}
                        onChange={(nextValue) =>
                          updateLineTextField(index, 'priority', nextValue)
                        }
                        placeholder={t(
                          'engineering.cuttingPlan.placeholders.priority'
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className='flex h-8 items-center justify-center'>
                        <Switch
                          checked={line.mustFulfill ?? true}
                          onCheckedChange={(checked) =>
                            updateLineBooleanField(
                              index,
                              'mustFulfill',
                              Boolean(checked)
                            )
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex h-8 items-center justify-center'>
                        <Switch
                          checked={line.allowMixedPlan ?? false}
                          onCheckedChange={(checked) =>
                            updateLineBooleanField(
                              index,
                              'allowMixedPlan',
                              Boolean(checked)
                            )
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <ReadonlyLineValue value={line.faw} />
                    </TableCell>
                    <TableCell>
                      <ReadonlyLineValue value={line.weightG} />
                    </TableCell>
                    <TableCell>
                      <ReadonlyLineValue value={line.areaM2} />
                    </TableCell>
                    <TableCell>
                      <div className='grid gap-1.5'>
                        <LineInput
                          value={line.operationNote}
                          onChange={(nextValue) =>
                            updateLineTextField(
                              index,
                              'operationNote',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.operationNote'
                          )}
                        />
                        <LineInput
                          value={line.constraintProfile?.processTags?.join(
                            ', '
                          )}
                          onChange={(nextValue) =>
                            updateLineConstraintProfileField(
                              index,
                              'processTags',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.processTags'
                          )}
                        />
                        <LineInput
                          value={line.constraintProfile?.noteKeywords?.join(
                            ', '
                          )}
                          onChange={(nextValue) =>
                            updateLineConstraintProfileField(
                              index,
                              'noteKeywords',
                              nextValue
                            )
                          }
                          placeholder={t(
                            'engineering.cuttingPlan.placeholders.noteKeywords'
                          )}
                        />
                        <div className='flex items-center justify-between rounded-lg border border-dashed border-muted/60 px-2 py-1.5'>
                          <span className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                            {t(
                              'engineering.cuttingPlan.fields.manualGroupBreakBefore'
                            )}
                          </span>
                          <Switch
                            checked={line.manualGroupBreakBefore ?? false}
                            onCheckedChange={(checked) =>
                              updateLineBooleanField(
                                index,
                                'manualGroupBreakBefore',
                                Boolean(checked)
                              )
                            }
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => removeLine(index)}
                        className='size-8 rounded-full text-muted-foreground hover:text-destructive'
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function EditorField({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label className='mb-1.5 text-[10px] font-black tracking-widest text-muted-foreground'>
        {label}
        {required ? <span className='ml-1 text-destructive'>*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function LineInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <Input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className='h-8 rounded-lg border-muted/60 bg-background text-xs font-semibold'
    />
  )
}

function ReadonlyLineValue({
  value,
  placeholder,
}: {
  value?: string
  placeholder?: string
}) {
  return (
    <Input
      value={value || ''}
      readOnly
      placeholder={placeholder}
      className='h-8 rounded-lg border-muted/60 bg-muted/20 text-xs font-semibold text-foreground'
    />
  )
}
