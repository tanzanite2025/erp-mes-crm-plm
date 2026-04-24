import { type ReactNode, useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Database,
  Hash,
  Layers3,
  type LucideIcon,
  Pencil,
  Plus,
  Ruler,
  Search,
  Tag,
  Waves,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { PrepregLabelCapturePanel } from '../components/prepreg-label-capture-panel'
import {
  buildPrepregSpecPayload,
  EMPTY_PREPREG_FORM,
  formFromPrepregSpec,
  mergePrepregRecognizedFields,
  prepregSpecSummary,
  type PrepregFormState,
  type PrepregMaterialSpec,
  type PrepregMaterialSpecStatus,
} from '../data/prepreg-material-spec-schema'
import {
  PrepregMaterialSpecService,
} from '../services/prepreg-material-spec-service'

export function PrepregCatalogPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<PrepregMaterialSpec | null>(null)
  const [form, setForm] = useState<PrepregFormState>(EMPTY_PREPREG_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['raw-materials', 'prepreg-specs', searchTerm],
    queryFn: () => PrepregMaterialSpecService.list(searchTerm, 1, 200),
  })

  const specs = data?.items ?? []
  const activeCount = specs.filter((item) => item.status === 'Active').length
  const batchHintCount = specs.filter((item) => item.supplierBatchNo).length

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<PrepregMaterialSpec>) => PrepregMaterialSpecService.save(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['raw-materials', 'prepreg-specs'] })
      toast.success(editingSpec ? '预浸料规格已更新' : '预浸料规格已建立')
      setDialogOpen(false)
      setEditingSpec(null)
      setForm(EMPTY_PREPREG_FORM)
    },
  })

  const openCreate = () => {
    setEditingSpec(null)
    setForm(EMPTY_PREPREG_FORM)
    setDialogOpen(true)
  }

  const openEdit = (spec: PrepregMaterialSpec) => {
    setEditingSpec(spec)
    setForm(formFromPrepregSpec(spec))
    setDialogOpen(true)
  }

  const updateForm = <K extends keyof PrepregFormState>(key: K, value: PrepregFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const applyRecognizedFields = useCallback((fields: Partial<PrepregFormState>) => {
    setForm((current) => mergePrepregRecognizedFields(current, fields))
    toast.success('识别结果已填入，请核对后保存')
  }, [])

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('请先填写产品编号和产品名称')
      return
    }
    saveMutation.mutate(buildPrepregSpecPayload(form, editingSpec))
  }

  return (
    <div className='flex flex-col gap-5 animate-in fade-in duration-700'>
      <section className='rounded-[28px] border border-dashed border-muted/60 bg-muted/10 p-5 shadow-inner'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-primary'>
              <Database className='size-5' />
              <h2 className='text-sm font-black italic tracking-tighter'>预浸料规格主数据</h2>
            </div>
            <p className='max-w-4xl text-[9px] font-black uppercase tracking-widest leading-5 text-muted-foreground/60'>
              这里只维护预浸料原材料本身的定义信息：产品编号、名称、型号、树脂含量、幅宽、克重和批次样例。当前页面只负责原材料定义。
            </p>
          </div>

          <div className='grid grid-cols-3 gap-2 text-center lg:min-w-[360px]'>
            <Metric label='规格数' value={specs.length} />
            <Metric label='启用' value={activeCount} />
            <Metric label='批次样例' value={batchHintCount} />
          </div>
        </div>

        <div className='mt-4 grid gap-2 md:grid-cols-4'>
          <FlowStep label='基础定义' value='名称 / 型号 / 幅宽 / 树脂' />
          <FlowStep label='标签信息' value='供应批次 / 卷号 / 生产日期' />
          <FlowStep label='工艺识别' value='纤维型号 / 克重 / 标称面积' />
          <FlowStep label='边界说明' value='当前只做原材料定义' />
        </div>
      </section>

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='relative w-full md:max-w-md'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='搜索产品编号、名称、供应商型号'
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-[10px] font-black tracking-[0.16em] shadow-inner placeholder:text-muted-foreground/45'
          />
        </div>
        <Button onClick={openCreate} className='h-11 rounded-full px-7 text-[10px] font-black uppercase tracking-widest'>
          <Plus className='size-4' />
          新增预浸料规格
        </Button>
      </div>

      <div className='overflow-hidden rounded-[28px] border border-dashed border-muted/60 bg-background shadow-sm'>
        <div className='hidden grid-cols-[1.2fr_1fr_1fr_1fr_100px] border-b border-dashed border-muted/60 bg-muted/25 px-5 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60 md:grid'>
          <span>产品与型号</span>
          <span>纤维 / 树脂</span>
          <span>宽幅 / 克重</span>
          <span>批次识别</span>
          <span className='text-right'>操作</span>
        </div>

        {isLoading ? (
          <div className='p-10 text-center text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/50'>加载预浸料规格...</div>
        ) : specs.length === 0 ? (
          <div className='p-12 text-center'>
            <p className='text-[10px] font-black uppercase tracking-[0.24em] text-foreground/80'>还没有预浸料规格</p>
            <p className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>先把供应商标签上的产品编号、名称、幅宽、树脂含量录入进来。</p>
          </div>
        ) : (
          specs.map((spec) => (
            <button
              key={spec.id}
              type='button'
              onClick={() => openEdit(spec)}
              className='grid w-full gap-3 border-b border-dashed border-muted/50 px-5 py-4 text-left transition hover:bg-muted/20 md:grid-cols-[1.2fr_1fr_1fr_1fr_100px] md:items-center'
            >
              <div className='space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-mono text-[10px] font-black tracking-[0.2em] text-foreground/80'>{spec.code}</span>
                  <Badge className='rounded-full border-none bg-primary/10 text-[8px] font-mono uppercase tracking-widest text-primary'>
                    {spec.status === 'Active' ? '启用' : spec.status === 'Inactive' ? '停用' : '归档'}
                  </Badge>
                </div>
                <div className='text-sm font-black italic tracking-tighter text-foreground/90'>{spec.name}</div>
                <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {prepregSpecSummary(spec) || '未填写规格摘要'}
                </div>
              </div>
              <InfoCell
                icon={Waves}
                main={spec.fiberModel || '未填写纤维型号'}
                sub={[
                  spec.resinModel ? `树脂 ${spec.resinModel}` : '',
                  spec.resinContentPercent ? `RC ${spec.resinContentPercent}%` : '',
                ].filter(Boolean).join(' / ') || '未填写树脂型号与含量'}
              />
              <InfoCell icon={Ruler} main={spec.widthMm ? `${spec.widthMm} mm` : '未填写宽幅'} sub={spec.areaWeightGsm ? `${spec.areaWeightGsm} g/m2` : '未填写克重'} />
              <InfoCell icon={Hash} main={spec.supplierBatchNo || '未填写批次样例'} sub={spec.rollNo ? `卷/箱 ${spec.rollNo}` : '未填写卷号样例'} />
              <div className='flex justify-end'>
                <span className='inline-flex size-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground'>
                  <Pencil className='size-4' />
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[86vh] gap-3 overflow-y-auto rounded-[24px] p-5 sm:max-w-[1040px]'>
          <DialogHeader className='space-y-1'>
            <DialogTitle className='flex items-center gap-2 text-lg font-black italic uppercase tracking-tighter'>
              <Layers3 className='size-5 text-primary' />
              {editingSpec ? '编辑预浸料规格' : '新增预浸料规格'}
            </DialogTitle>
          </DialogHeader>

          <PrepregLabelCapturePanel onApply={applyRecognizedFields} />

          <div className='grid gap-3 md:grid-cols-3 [&_input]:h-9 [&_input]:rounded-xl'>
            <Field label='产品编号' required icon={Hash}>
              <Input value={form.code} onChange={(event) => updateForm('code', event.target.value)} placeholder='例如 CFS-247-75' />
            </Field>
            <Field label='产品名称' required icon={Tag}>
              <Input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder='例如 单向碳纱 / 预浸布' />
            </Field>
            <Field label='供应商型号'>
              <Input value={form.supplierProductCode} onChange={(event) => updateForm('supplierProductCode', event.target.value)} placeholder='标签上的规格型号' />
            </Field>
            <Field label='纤维型号'>
              <Input value={form.fiberModel} onChange={(event) => updateForm('fiberModel', event.target.value)} placeholder='例如 T700 / T800 / 40F' />
            </Field>
            <Field label='树脂型号'>
              <Input value={form.resinModel} onChange={(event) => updateForm('resinModel', event.target.value)} placeholder='例如 慧柏5001' />
            </Field>
            <Field label='树脂含量 RC (%)'>
              <Input value={form.resinContentPercent} onChange={(event) => updateForm('resinContentPercent', event.target.value)} placeholder='例如 37' />
            </Field>
            <Field label='幅宽 (mm)'>
              <Input value={form.widthMm} onChange={(event) => updateForm('widthMm', event.target.value)} placeholder='例如 1000' />
            </Field>
            <Field label='克重 / 面密度'>
              <Input value={form.areaWeightGsm} onChange={(event) => updateForm('areaWeightGsm', event.target.value)} placeholder='例如 260/204' />
            </Field>
            <Field label='标称面积 (m2)'>
              <Input value={form.nominalAreaM2} onChange={(event) => updateForm('nominalAreaM2', event.target.value)} placeholder='例如 150' />
            </Field>
            <Field label='供应批次样例'>
              <Input value={form.supplierBatchNo} onChange={(event) => updateForm('supplierBatchNo', event.target.value)} placeholder='例如 20260306AM' />
            </Field>
            <Field label='卷号 / 箱号样例'>
              <Input value={form.rollNo} onChange={(event) => updateForm('rollNo', event.target.value)} placeholder='例如 23' />
            </Field>
            <Field label='生产日期' icon={Calendar}>
              <Input value={form.productionDate} onChange={(event) => updateForm('productionDate', event.target.value)} placeholder='例如 2026-03-06' />
            </Field>
            <Field label='状态'>
              <Select value={form.status} onValueChange={(value) => updateForm('status', value as PrepregMaterialSpecStatus)}>
                <SelectTrigger className='h-9 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Active'>启用</SelectItem>
                  <SelectItem value='Inactive'>停用</SelectItem>
                  <SelectItem value='Archived'>归档</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label='储存要求' className='md:col-span-3'>
              <Input value={form.storageRequirement} onChange={(event) => updateForm('storageRequirement', event.target.value)} placeholder='例如 -18C 冷藏、回温限制、保质期' />
            </Field>
            <Field label='备注' className='md:col-span-3'>
              <Textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder='补充供应商、检验、替代料或使用限制'
                className='min-h-[64px] resize-none rounded-xl'
              />
            </Field>
          </div>

          <DialogFooter className='pt-1'>
            <Button variant='outline' onClick={() => setDialogOpen(false)} className='h-9 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className='h-9 rounded-full px-8 text-[10px] font-black uppercase tracking-widest'>
              {saveMutation.isPending ? '保存中...' : '保存规格'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-3'>
      <div className='text-base font-black tabular-nums tracking-tight text-foreground/90'>{value}</div>
      <div className='mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{label}</div>
    </div>
  )
}

function FlowStep({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/45 bg-background/70 p-3'>
      <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{label}</div>
      <div className='mt-2 text-[9px] font-black uppercase tracking-widest leading-5 text-foreground/75'>{value}</div>
    </div>
  )
}

function InfoCell({
  icon: Icon,
  main,
  sub,
}: {
  icon: LucideIcon
  main: string
  sub: string
}) {
  return (
    <div className='flex items-start gap-2'>
      <Icon className='mt-0.5 size-4 shrink-0 text-primary/60' />
      <div className='min-w-0'>
        <div className='truncate text-[10px] font-black uppercase tracking-[0.16em] text-foreground/80'>{main}</div>
        <div className='truncate text-[8px] font-mono uppercase tracking-widest text-muted-foreground/55'>{sub}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  icon: Icon,
  className,
  children,
}: {
  label: string
  required?: boolean
  icon?: LucideIcon
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label className='mb-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
        {Icon ? <Icon className='size-3.5 text-primary/70' /> : null}
        {label}
        {required ? <span className='text-destructive'>*</span> : null}
      </Label>
      {children}
    </div>
  )
}
