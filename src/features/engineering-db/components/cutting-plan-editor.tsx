import { useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import {
  formatCutSizeExpression,
  type CutSizeUnit,
} from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { CutSizeLibraryService } from '@/features/raw-materials/cut-size-library/services/cut-size-library-service'
import type { PrepregMaterialSpec } from '@/features/raw-materials/data/prepreg-material-spec-schema'
import { PrepregMaterialSpecService } from '@/features/raw-materials/services/prepreg-material-spec-service'
import {
  buildCuttingPlanName,
  createEmptyCuttingPlanLine,
  type CuttingPlanInput,
  type CuttingPlanStatus,
} from '../data/cutting-plan-schema'

interface CuttingPlanEditorProps {
  value: CuttingPlanInput
  onChange: (value: CuttingPlanInput) => void
}

type PlanField = Exclude<keyof CuttingPlanInput, 'lines'>
type PlanLine = CuttingPlanInput['lines'][number]

const PREPREG_SPECS_QUERY_KEY = ['raw-materials', 'prepreg-specs', 'active-options'] as const
const CUT_SIZE_OPTIONS_QUERY_KEY = ['raw-materials', 'cut-size-library', 'active-options'] as const

function formatPercent(value: string): string {
  const text = value.trim()
  if (!text) return ''
  return text.endsWith('%') ? text : `${text}%`
}

function tryExtractResinModel(spec: PrepregMaterialSpec): string {
  if (spec.resinModel?.trim()) return spec.resinModel.trim()
  const source = `${spec.description || ''} ${spec.name || ''}`.trim()
  if (!source) return ''
  const matched = source.match(/(?:树脂型号|Resin(?:\s*Model)?)[:：\s]*([^\s,，;；]+)/i)
  return matched?.[1]?.trim() || ''
}

function getPrepregLabel(spec: PrepregMaterialSpec): string {
  const rc = formatPercent(spec.resinContentPercent)
  const codePart = spec.code || spec.supplierProductCode || '--'
  const namePart = spec.name || '--'
  return rc ? `${codePart} | ${namePart} | RC ${rc}` : `${codePart} | ${namePart}`
}

function normalizeMatchText(value?: string): string {
  return value?.trim().toLowerCase() || ''
}

function findMatchedProduct(
  products: Product[],
  productCode?: string,
  productName?: string,
): Product | undefined {
  const normalizedCode = normalizeMatchText(productCode)
  const normalizedName = normalizeMatchText(productName)
  if (!normalizedCode && !normalizedName) return undefined

  return (
    products.find((product) => {
      const codeMatched = normalizedCode && normalizeMatchText(product.sku) === normalizedCode
      const nameMatched = normalizedName && normalizeMatchText(product.name) === normalizedName
      return Boolean(codeMatched && nameMatched)
    }) ||
    products.find((product) => normalizedCode && normalizeMatchText(product.sku) === normalizedCode) ||
    products.find((product) => normalizedName && normalizeMatchText(product.name) === normalizedName)
  )
}

function getCutSizeOptionLabel(item: CutSizeUnit): string {
  const expression = formatCutSizeExpression(item)
  return expression ? `${item.code} | ${item.name} | ${expression}` : `${item.code} | ${item.name}`
}

export function CuttingPlanEditor({ value, onChange }: CuttingPlanEditorProps) {
  const lines = value.lines ?? []
  const { data: products = [] } = useGetProducts()
  const { countOptions } = useActiveHoleCodeSource()

  const prepregQuery = useQuery({
    queryKey: PREPREG_SPECS_QUERY_KEY,
    queryFn: () => PrepregMaterialSpecService.list('', 1, 200),
    staleTime: 5 * 60 * 1000,
  })

  const cutSizeQuery = useQuery({
    queryKey: CUT_SIZE_OPTIONS_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })

  const prepregSpecs = useMemo(
    () => (prepregQuery.data?.items ?? []).filter((item) => item.status === 'Active'),
    [prepregQuery.data?.items]
  )

  const cutSizeUnits = cutSizeQuery.data ?? []

  const activeProducts = useMemo(
    () => products.filter((product) => product.status !== 'Archived'),
    [products]
  )

  const matchedProduct = useMemo(
    () => findMatchedProduct(activeProducts, value.productCode, value.productName),
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

  const updateField = <K extends PlanField>(field: K, nextValue: CuttingPlanInput[K]) => {
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
    const nextLines = lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    onChange({ ...value, lines: nextLines })
  }

  const updateLineField = (
    index: number,
    field: keyof PlanLine,
    nextValue: string
  ) => {
    if (field === 'sizeExpression') {
      updateLine(index, {
        sizeExpression: nextValue,
        cutSizeId: '',
        cutSizeCode: '',
        cutSizeName: '',
      })
      return
    }
    updateLine(index, { [field]: nextValue })
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
    updateLine(index, {
      cutSizeId: unit.id,
      cutSizeCode: unit.code,
      cutSizeName: unit.name,
      sizeExpression: formatCutSizeExpression(unit),
    })
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
      <div className='grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-4 [&_input]:h-10 [&_input]:rounded-2xl'>
        <EditorField label='方案名称' required>
          <Input
            value={value.name}
            readOnly
            placeholder='根据产品型号 + 孔数自动生成'
            className='bg-muted/15'
          />
        </EditorField>
        <EditorField label='产品型号' required>
          <Select value={value.productId || undefined} onValueChange={updateProduct}>
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue placeholder='请选择产品工程型号' />
            </SelectTrigger>
            <SelectContent>
              {activeProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.sku} | {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField label='孔数' required>
          <Select
            value={value.holeCount || undefined}
            onValueChange={(nextValue) => updateField('holeCount', nextValue)}
          >
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue placeholder='请选择共享编码源孔数' />
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
        <EditorField label='文件编号'>
          <Input
            value={value.documentNo}
            onChange={(event) => updateField('documentNo', event.target.value)}
            placeholder='例如 XD2603028'
          />
        </EditorField>

        <EditorField label='版次'>
          <Input
            value={value.revisionNo}
            onChange={(event) => updateField('revisionNo', event.target.value)}
            placeholder='A1'
          />
        </EditorField>
        <EditorField label='状态'>
          <Select
            value={value.status}
            onValueChange={(nextValue) => updateField('status', nextValue as CuttingPlanStatus)}
          >
            <SelectTrigger className='h-10 w-full rounded-2xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Draft'>草稿</SelectItem>
              <SelectItem value='Active'>启用</SelectItem>
              <SelectItem value='Archived'>归档</SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField label='生效日期'>
          <Input
            value={value.effectiveDate}
            onChange={(event) => updateField('effectiveDate', event.target.value)}
            placeholder='2026-03-24'
          />
        </EditorField>
        <EditorField label='引用预浸料'>
          <div className='space-y-1.5'>
            <Select value={value.prepregSpecId || undefined} onValueChange={updatePrepreg}>
              <SelectTrigger className='h-10 w-full rounded-2xl'>
                <SelectValue
                  placeholder={prepregQuery.isLoading ? '正在加载预浸料...' : '请选择预浸料'}
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
            <p className='min-h-5 px-1 text-[11px] font-semibold leading-5 text-muted-foreground'>
              {selectedPrepregSummary || '选择预浸料后自动带出碳丝、树脂和 RC 信息'}
            </p>
          </div>
        </EditorField>
      </div>

      <div className='rounded-2xl border border-dashed border-muted-foreground/20 bg-background'>
        <div className='flex flex-col gap-2 border-b border-dashed border-muted-foreground/20 p-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <div className='text-sm font-black'>裁片明细</div>
            <div className='text-[11px] font-semibold text-muted-foreground'>
              行项支持引用裁切尺寸库；引用后自动回填宽×长×片，可继续编辑其余工艺字段。
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={addLine}
            className='h-8 rounded-full text-xs font-black'
          >
            <Plus className='size-3.5' />
            添加裁片行
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30'>
              <TableHead className='w-12 text-center text-[10px] font-black'>序号</TableHead>
              <TableHead className='min-w-24 text-[10px] font-black'>卷制顺序</TableHead>
              <TableHead className='min-w-28 text-[10px] font-black'>纱别</TableHead>
              <TableHead className='min-w-56 text-[10px] font-black'>裁切尺寸库</TableHead>
              <TableHead className='min-w-28 text-[10px] font-black'>宽×长×片</TableHead>
              <TableHead className='min-w-20 text-[10px] font-black'>FAW</TableHead>
              <TableHead className='min-w-20 text-[10px] font-black'>重量</TableHead>
              <TableHead className='min-w-20 text-[10px] font-black'>面积m2</TableHead>
              <TableHead className='min-w-72 text-[10px] font-black'>操作说明</TableHead>
              <TableHead className='w-12 text-right' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className='h-24 text-center text-xs font-bold text-muted-foreground'
                >
                  还没有裁片行，先添加一行并绑定尺寸库条目。
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell className='text-center text-xs font-black'>{index + 1}</TableCell>
                  <TableCell>
                    <LineInput
                      value={line.rollOrder}
                      onChange={(nextValue) => updateLineField(index, 'rollOrder', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.yarnDirection}
                      onChange={(nextValue) => updateLineField(index, 'yarnDirection', nextValue)}
                      placeholder='C0'
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.cutSizeId || undefined}
                      onValueChange={(nextValue) => updateLineCutSize(index, nextValue)}
                    >
                      <SelectTrigger className='h-8 rounded-lg border-muted/60 bg-background text-xs font-semibold'>
                        <SelectValue
                          placeholder={cutSizeQuery.isLoading ? '加载中...' : '选择尺寸库单元'}
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
                    <LineInput
                      value={line.sizeExpression}
                      onChange={(nextValue) => updateLineField(index, 'sizeExpression', nextValue)}
                      placeholder='980x34x4'
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput value={line.faw} onChange={(nextValue) => updateLineField(index, 'faw', nextValue)} />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.weightG}
                      onChange={(nextValue) => updateLineField(index, 'weightG', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.areaM2}
                      onChange={(nextValue) => updateLineField(index, 'areaM2', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.operationNote}
                      onChange={(nextValue) => updateLineField(index, 'operationNote', nextValue)}
                      placeholder='例如 第一层主纱'
                    />
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
