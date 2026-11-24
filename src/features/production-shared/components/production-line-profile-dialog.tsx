import { useEffect, useMemo, useState } from 'react'
import { Factory } from 'lucide-react'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProductionLineMutationPayload } from '../contracts/production-line-mutation'
import type {
  ProductionLine,
  ProductionLineProductTemplate,
} from '../data/production-line'
import { useProductionLineProductTemplatesQuery } from '../hooks/use-production-resources'
import {
  normalizeProductionLineCode,
  normalizeProductionLineEntity,
} from '../utils/production-code-normalization'

interface ProductionLineProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingLine: ProductionLine | null
  entityLabel?: string
  lines: ProductionLine[]
  onSubmit: (payload: ProductionLineMutationPayload) => void | Promise<void>
}

interface ProductionLineProfileForm {
  productTemplateId: string
  name: string
  code: string
  description: string
}

const KEYWORD_MAP: Record<string, string> = {
  碳纤维: 'carbon',
  车圈: 'rim',
  前叉: 'fork',
  组装: 'assembly',
  成型: 'forming',
  产线: 'line',
  自动化: 'auto',
  手动: 'manual',
}

function createForm(line: ProductionLine | null): ProductionLineProfileForm {
  return {
    productTemplateId: line?.productTemplateId ?? '',
    name: line?.name ?? '',
    code: line?.code ?? '',
    description: line?.description ?? '',
  }
}

export function ProductionLineProfileDialog({
  open,
  onOpenChange,
  editingLine,
  entityLabel = 'L1',
  lines,
  onSubmit,
}: ProductionLineProfileDialogProps) {
  const [form, setForm] = useState<ProductionLineProfileForm>(() =>
    createForm(editingLine)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    data: productTemplates = [],
    isLoading: isLoadingProductTemplates,
    error: productTemplateError,
  } = useProductionLineProductTemplatesQuery({ enabled: open })

  const isEditing = Boolean(editingLine)
  const initialForm = useMemo(() => createForm(editingLine), [editingLine])
  const selectedProductTemplate = productTemplates.find(
    (template) => template.id === form.productTemplateId
  )
  const selectableProductTemplates = productTemplates.filter(
    (template) =>
      template.active || template.id === editingLine?.productTemplateId
  )
  const canSaveSelectedProductTemplate = Boolean(
    selectedProductTemplate &&
    (selectedProductTemplate.active ||
      selectedProductTemplate.id === editingLine?.productTemplateId)
  )

  useEffect(() => {
    if (open) {
      setForm(initialForm)
      setIsSubmitting(false)
    }
  }, [initialForm, open])

  const generateLineCode = (name: string) => {
    let prefix = ''
    Object.entries(KEYWORD_MAP).forEach(([keyword, value]) => {
      if (name.includes(keyword)) {
        prefix += value
      }
    })

    if (!prefix) {
      prefix = 'line'
    }
    if (!prefix.endsWith('line')) {
      prefix += 'line'
    }

    const usedCodes = new Set(lines.map((line) => line.code))
    let index = lines.length + 1
    let candidate = normalizeProductionLineCode(
      `${prefix.toLowerCase()}-${String(index).padStart(3, '0')}`
    )
    while (usedCodes.has(candidate)) {
      index += 1
      candidate = normalizeProductionLineCode(
        `${prefix.toLowerCase()}-${String(index).padStart(3, '0')}`
      )
    }
    return candidate
  }

  const handleProductTemplateChange = (
    productTemplate: ProductionLineProductTemplate
  ) => {
    setForm((current) => ({
      ...current,
      productTemplateId: productTemplate.id,
      name: productTemplate.name,
      code: isEditing ? current.code : generateLineCode(productTemplate.name),
    }))
  }

  const handleSubmit = async () => {
    const name = selectedProductTemplate?.name.trim() ?? ''
    const productTemplateId = form.productTemplateId.trim()
    if (!name || !productTemplateId || !canSaveSelectedProductTemplate) {
      return
    }

    setIsSubmitting(true)
    try {
      const code = normalizeProductionLineCode(form.code)
      const description = form.description.trim()

      if (editingLine) {
        const delta = buildFlattenDelta(
          {
            name: editingLine.name,
            productTemplateId: editingLine.productTemplateId ?? '',
            code: editingLine.code,
            description: editingLine.description,
          },
          { name, productTemplateId, code, description }
        )

        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }

        await onSubmit({
          type: 'UPDATE',
          id: editingLine.id,
          delta,
          version: editingLine.version,
        })
      } else {
        const now = new Date().toISOString()
        await onSubmit({
          type: 'CREATE',
          data: normalizeProductionLineEntity({
            id: '',
            code,
            name,
            productTemplateId,
            description,
            version: 1,
            isActive: true,
            createdAt: now,
            updatedAt: now,
            segments: [],
          }),
        })
      }
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[620px] rounded-[32px] border-none p-0 shadow-2xl'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative space-y-6 p-5 md:p-7'>
          <DialogHeader className='space-y-2 text-left'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/10'>
                <Factory className='size-4 text-primary' />
              </div>
              <div className='space-y-1'>
                <DialogTitle className='text-sm font-black tracking-tighter uppercase'>
                  {isEditing ? `编辑 ${entityLabel}` : `新增 ${entityLabel}`}
                </DialogTitle>
                <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {entityLabel} 读取产品侧模板，名称随模板主数据显示。
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2 md:col-span-2'>
              <Label
                htmlFor='production-line-profile-product-template'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'
              >
                产品模板
              </Label>
              <Select
                value={form.productTemplateId || undefined}
                onValueChange={(id) => {
                  const template = selectableProductTemplates.find(
                    (item) => item.id === id
                  )
                  if (template) {
                    handleProductTemplateChange(template)
                  }
                }}
                disabled={isLoadingProductTemplates || isSubmitting}
              >
                <SelectTrigger
                  id='production-line-profile-product-template'
                  className='h-11 rounded-2xl border-none bg-muted/50 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
                >
                  <SelectValue
                    placeholder={
                      isLoadingProductTemplates
                        ? '正在读取产品模板'
                        : '选择产品模板'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectableProductTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {productTemplateError && (
                <p className='ml-1 text-xs text-destructive'>
                  产品模板读取失败，请关闭后重试。
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='production-line-profile-name'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'
              >
                {entityLabel} 名称
              </Label>
              <Input
                id='production-line-profile-name'
                value={selectedProductTemplate?.name ?? form.name}
                readOnly
                placeholder='选择产品模板后读取名称'
                className='h-11 rounded-2xl border-none bg-muted/50 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor='production-line-profile-code'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'
              >
                {entityLabel} 编码
              </Label>
              <Input
                id='production-line-profile-code'
                value={form.code}
                readOnly={!isEditing}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                placeholder={`自动生成或填写 ${entityLabel} 编码`}
                className='h-11 rounded-2xl border-none bg-muted/50 font-maple-ui shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
              <p className='ml-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                新增时会根据名称生成编码，编辑时可手动修正。
              </p>
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label
                htmlFor='production-line-profile-description'
                className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'
              >
                {entityLabel} 说明
              </Label>
              <Textarea
                id='production-line-profile-description'
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={`补充 ${entityLabel} 说明`}
                className='min-h-24 resize-none rounded-2xl border-none bg-muted/50 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className='h-11 rounded-full border-muted px-8'
            >
              取消
            </Button>
            <Button
              type='button'
              onClick={() => void handleSubmit()}
              disabled={
                !form.productTemplateId ||
                !canSaveSelectedProductTemplate ||
                isSubmitting
              }
              className='h-11 rounded-full px-8 shadow-xl shadow-blue-500/20'
            >
              {isEditing ? '保存' : '确认新增'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
