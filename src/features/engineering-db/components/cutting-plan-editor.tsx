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
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { useActiveHoleCodeSource } from '@/features/code-center/hooks/use-hole-code-source'
import { PrepregMaterialSpecService } from '@/features/raw-materials/services/prepreg-material-spec-service'
import type { PrepregMaterialSpec } from '@/features/raw-materials/data/prepreg-material-spec-schema'
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
type LineField =
  | 'rollOrder'
  | 'yarnDirection'
  | 'sizeExpression'
  | 'faw'
  | 'weightG'
  | 'areaM2'
  | 'operationNote'

const PREPREG_SPECS_QUERY_KEY = ['raw-materials', 'prepreg-specs', 'active-options'] as const

function formatPercent(value: string): string {
  const text = value.trim()
  if (!text) return ''
  return text.endsWith('%') ? text : `${text}%`
}

function tryExtractResinModel(spec: PrepregMaterialSpec): string {
  if (spec.resinModel?.trim()) return spec.resinModel.trim()
  const source = `${spec.description || ''} ${spec.name || ''}`.trim()
  if (!source) return ''
  const matched = source.match(
    /(?:树脂型号|樹脂型号|Resin(?:\s*Model)?)[:：]\s*([^\s,，;；/]+)/i,
  )
  return matched?.[1]?.trim() || ''
}

function getPrepregLabel(spec: PrepregMaterialSpec): string {
  const rc = formatPercent(spec.resinContentPercent)
  const codePart = spec.code ? spec.code : spec.supplierProductCode || '--'
  const namePart = spec.name || '--'
  return rc ? `${codePart} | ${namePart} | RC ${rc}` : `${codePart} | ${namePart}`
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

  const prepregSpecs = useMemo(
    () => (prepregQuery.data?.items ?? []).filter((item) => item.status === 'Active'),
    [prepregQuery.data?.items],
  )

  const activeProducts = useMemo(
    () => products.filter((product) => product.status !== 'Archived'),
    [products],
  )

  const generatedName = useMemo(
    () =>
      buildCuttingPlanName({
        productName: value.productName,
        productCode: value.productCode,
        holeCount: value.holeCount,
      }),
    [value.productCode, value.productName, value.holeCount],
  )

  useEffect(() => {
    if (value.name === generatedName) return
    onChange({ ...value, name: generatedName })
  }, [generatedName, onChange, value])

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

  const updateLine = (index: number, field: LineField, nextValue: string) => {
    const nextLines = lines.map((line, lineIndex) =>
      lineIndex === index ? { ...line, [field]: nextValue } : line,
    )
    onChange({ ...value, lines: nextLines })
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
      <div className='grid gap-3 md:grid-cols-4 [&_input]:h-9 [&_input]:rounded-xl'>
        <EditorField label='方案名称' required>
          <Input value={value.name} readOnly placeholder='根据产品型号 + 孔数自动生成' />
        </EditorField>
        <EditorField label='产品型号' required>
          <Select value={value.productId || undefined} onValueChange={updateProduct}>
            <SelectTrigger className='h-9 rounded-xl'>
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
            <SelectTrigger className='h-9 rounded-xl'>
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
            <SelectTrigger className='h-9 rounded-xl'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Draft'>草稿</SelectItem>
              <SelectItem value='Active'>启用</SelectItem>
              <SelectItem value='Archived'>归档</SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField label='产品编码'>
          <Input value={value.productCode} readOnly placeholder='选择产品后自动带出' />
        </EditorField>
        <EditorField label='产品名称' className='md:col-span-2'>
          <Input value={value.productName} readOnly placeholder='选择产品后自动带出' />
        </EditorField>
        <EditorField label='生效日期'>
          <Input
            value={value.effectiveDate}
            onChange={(event) => updateField('effectiveDate', event.target.value)}
            placeholder='2026-03-24'
          />
        </EditorField>
        <EditorField label='RC含量'>
          <Input value={value.resinContentPercent} readOnly placeholder='选择预浸料后自动带出' />
        </EditorField>
        <EditorField label='碳丝型号' className='md:col-span-2'>
          <Input value={value.carbonFiberModel} readOnly placeholder='选择预浸料后自动带出' />
        </EditorField>
        <EditorField label='树脂型号'>
          <Input value={value.resinModel} readOnly placeholder='选择预浸料后自动带出' />
        </EditorField>
        <EditorField label='引用预浸料'>
          <Select value={value.prepregSpecId || undefined} onValueChange={updatePrepreg}>
            <SelectTrigger className='h-9 rounded-xl'>
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
        </EditorField>
      </div>

      <div className='rounded-2xl border border-dashed border-muted-foreground/20 bg-background'>
        <div className='flex flex-col gap-2 border-b border-dashed border-muted-foreground/20 p-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <div className='text-sm font-black'>裁片明细</div>
            <div className='text-[11px] font-semibold text-muted-foreground'>
              记录纱别、尺寸、FAW、重量、面积和操作说明；后续执行单会引用这里的行。
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
              <TableHead className='min-w-36 text-[10px] font-black'>宽*长*片</TableHead>
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
                  colSpan={9}
                  className='h-24 text-center text-xs font-bold text-muted-foreground'
                >
                  还没有裁片行，先添加一行，把图里的 C0 / C20 / C45 等规则录进来。
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell className='text-center text-xs font-black'>{index + 1}</TableCell>
                  <TableCell>
                    <LineInput
                      value={line.rollOrder}
                      onChange={(nextValue) => updateLine(index, 'rollOrder', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.yarnDirection}
                      onChange={(nextValue) => updateLine(index, 'yarnDirection', nextValue)}
                      placeholder='C0'
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.sizeExpression}
                      onChange={(nextValue) => updateLine(index, 'sizeExpression', nextValue)}
                      placeholder='980×34×4'
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.faw}
                      onChange={(nextValue) => updateLine(index, 'faw', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.weightG}
                      onChange={(nextValue) => updateLine(index, 'weightG', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.areaM2}
                      onChange={(nextValue) => updateLine(index, 'areaM2', nextValue)}
                    />
                  </TableCell>
                  <TableCell>
                    <LineInput
                      value={line.operationNote}
                      onChange={(nextValue) => updateLine(index, 'operationNote', nextValue)}
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
      <Label className='mb-1.5 text-[9px] font-black tracking-widest text-muted-foreground'>
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
