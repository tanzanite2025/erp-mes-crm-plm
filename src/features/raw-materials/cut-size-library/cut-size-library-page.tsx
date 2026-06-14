import { type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Plus, Ruler, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
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
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  formatSupportedCutAngleLabel,
  SUPPORTED_CUT_ANGLE_OPTIONS,
} from '../utils/cut-orientation'
import {
  formFromCutSizeUnit,
  EMPTY_CUT_SIZE_UNIT_FORM,
  type CutSizeUnit,
  type CutSizeUnitFormState,
  type CutSizeUnitStatus,
} from './data/cut-size-library-schema'
import {
  deriveCutSizeAreaM2,
  deriveCutSizeWeightG,
  formatCutSizeExpression,
  resolveCutSizeAreaM2,
  resolveCutSizeWeightG,
} from './domain/cut-size-geometry'
import { CutSizeLibraryService } from './services/cut-size-library-service'

const CUT_SIZE_LIBRARY_QUERY_KEY = [
  'raw-materials',
  'cut-size-library',
] as const

function statusLabel(status: CutSizeUnitStatus): string {
  if (status === 'Active') return '启用'
  if (status === 'Inactive') return '停用'
  return '归档'
}

function statusBadgeClass(status: CutSizeUnitStatus): string {
  if (status === 'Active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
  }
  if (status === 'Inactive') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-500'
  }
  return 'border-border/60 bg-muted/20 text-muted-foreground'
}

function areaLabel(
  item: Pick<CutSizeUnit, 'areaM2' | 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  const area = resolveCutSizeAreaM2(item)
  return area ? `${area} m²` : '--'
}

function weightLabel(
  item: Pick<
    CutSizeUnit,
    | 'weightG'
    | 'areaM2'
    | 'areaWeightGsm'
    | 'widthMm'
    | 'lengthMm'
    | 'pieceCount'
  >
): string {
  const weight = resolveCutSizeWeightG(item)
  return weight ? `${weight} g` : '--'
}

export function CutSizeLibraryPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<CutSizeUnit | null>(null)
  const [form, setForm] = useState<CutSizeUnitFormState>(
    EMPTY_CUT_SIZE_UNIT_FORM
  )

  const { data: units = [], isLoading } = useQuery({
    queryKey: [...CUT_SIZE_LIBRARY_QUERY_KEY, searchTerm],
    queryFn: () => CutSizeLibraryService.list(searchTerm),
  })

  const stats = useMemo(
    () => ({
      total: units.length,
      active: units.filter((item) => item.status === 'Active').length,
      archived: units.filter((item) => item.status === 'Archived').length,
    }),
    [units]
  )

  const saveMutation = useMutation({
    mutationFn: () => CutSizeLibraryService.save(form, editingUnit),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUT_SIZE_LIBRARY_QUERY_KEY,
      })
      toast.success(editingUnit ? '裁切尺寸单元已更新' : '裁切尺寸单元已创建')
      setDialogOpen(false)
      setEditingUnit(null)
      setForm(EMPTY_CUT_SIZE_UNIT_FORM)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CutSizeLibraryService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUT_SIZE_LIBRARY_QUERY_KEY,
      })
      toast.success('裁切尺寸单元已删除')
    },
  })

  const openCreate = () => {
    setEditingUnit(null)
    setForm(EMPTY_CUT_SIZE_UNIT_FORM)
    setDialogOpen(true)
  }

  const openEdit = (item: CutSizeUnit) => {
    setEditingUnit(item)
    setForm(formFromCutSizeUnit(item))
    setDialogOpen(true)
  }

  const updateForm = <K extends keyof CutSizeUnitFormState>(
    key: K,
    value: CutSizeUnitFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const derivedAreaM2 = useMemo(
    () =>
      deriveCutSizeAreaM2({
        widthMm: form.widthMm,
        lengthMm: form.lengthMm,
        pieceCount: form.pieceCount,
      }),
    [form.widthMm, form.lengthMm, form.pieceCount]
  )
  const resolvedFormAreaM2 = derivedAreaM2 || form.areaM2.trim()
  const derivedWeightG = useMemo(
    () =>
      deriveCutSizeWeightG({
        widthMm: form.widthMm,
        lengthMm: form.lengthMm,
        pieceCount: form.pieceCount,
        areaM2: resolvedFormAreaM2,
        areaWeightGsm: form.areaWeightGsm,
      }),
    [
      form.widthMm,
      form.lengthMm,
      form.pieceCount,
      resolvedFormAreaM2,
      form.areaWeightGsm,
    ]
  )
  const resolvedFormWeightG = derivedWeightG || form.weightG.trim()

  const handleSave = () => {
    if (!form.code.trim()) {
      toast.error('请填写尺寸编号')
      return
    }
    if (!form.name.trim()) {
      toast.error('请填写尺寸名称')
      return
    }
    if (
      !form.widthMm.trim() ||
      !form.lengthMm.trim() ||
      !form.pieceCount.trim()
    ) {
      toast.error('请至少填写宽度、长度和张数')
      return
    }
    if (!resolvedFormAreaM2) {
      toast.error('请先补齐宽度、长度和张数以自动计算面积')
      return
    }
    if (!form.areaWeightGsm.trim()) {
      toast.error('请填写面密度')
      return
    }
    if (!resolvedFormWeightG) {
      toast.error('当前无法自动换算重量，请检查面积和面密度')
      return
    }
    saveMutation.mutate()
  }

  return (
    <div className='flex flex-col gap-5'>
      <IndustrialHeader
        icon={Ruler}
        title={t('rawMaterials.cutSizeLibrary.title')}
        description={t('rawMaterials.cutSizeLibrary.description')}
        statusBadge={
          <div className='rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black tracking-widest text-primary/80 uppercase'>
            {t('rawMaterials.cutSizeLibrary.status')}
          </div>
        }
      />

      <section className='rounded-[28px] border border-border/50 bg-card p-5 shadow-none'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
            <div className='space-y-2'>
              <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
                {t('rawMaterials.cutSizeLibrary.sections.dataset.kicker')}
              </p>
              <h2 className='text-base font-black tracking-tight text-foreground'>
                {t('rawMaterials.cutSizeLibrary.sections.dataset.title')}
              </h2>
              <p className='text-xs leading-5 text-muted-foreground/80'>
                {t('rawMaterials.cutSizeLibrary.sections.dataset.description')}
              </p>
            </div>
            <div className='grid grid-cols-3 gap-2 text-center lg:min-w-[340px]'>
              <Metric label='尺寸总数' value={stats.total} />
              <Metric label='启用' value={stats.active} />
              <Metric label='归档' value={stats.archived} />
            </div>
          </div>

          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='relative w-full md:max-w-md'>
              <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='搜索编号、名称、用途、角度'
                className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-semibold shadow-inner'
              />
            </div>
            <Button
              onClick={openCreate}
              className='h-11 rounded-full px-6 text-xs font-black'
            >
              <Plus className='size-4' />
              {t('rawMaterials.cutSizeLibrary.actions.add')}
            </Button>
          </div>

          <div className='overflow-x-auto rounded-2xl border border-border/40 bg-muted/5'>
            <table className='w-full min-w-[1180px] text-sm'>
              <thead className='bg-muted/10 text-left'>
                <tr>
                  {[
                    t('rawMaterials.cutSizeLibrary.columns.code'),
                    t('rawMaterials.cutSizeLibrary.columns.name'),
                    t('rawMaterials.cutSizeLibrary.columns.size'),
                    '面积 / 面密度 / 重量',
                    t('rawMaterials.cutSizeLibrary.columns.angle'),
                    t('rawMaterials.cutSizeLibrary.columns.layup'),
                    t('rawMaterials.cutSizeLibrary.columns.usage'),
                    t('rawMaterials.cutSizeLibrary.columns.status'),
                    '操作',
                  ].map((label) => (
                    <th
                      key={label}
                      className='px-4 py-3 text-[10px] font-black tracking-[0.22em] text-muted-foreground/60 uppercase'
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className='px-4 py-8 text-center text-xs font-semibold text-muted-foreground'
                    >
                      正在加载裁切尺寸库...
                    </td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan={9} className='px-4 py-8 text-center'>
                      <p className='text-[11px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase'>
                        {t('rawMaterials.cutSizeLibrary.empty.title')}
                      </p>
                      <p className='mt-1 text-xs leading-5 text-muted-foreground/40'>
                        {t('rawMaterials.cutSizeLibrary.empty.description')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  units.map((item) => (
                    <tr key={item.id} className='border-t border-border/40'>
                      <td className='px-4 py-3 align-top'>
                        <div className='font-mono text-xs font-black tracking-wider text-foreground/90'>
                          {item.code}
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='text-xs font-black text-foreground/90'>
                          {item.name}
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top text-xs font-semibold text-muted-foreground'>
                        {formatCutSizeExpression(item) || '--'}
                      </td>
                      <td className='px-4 py-3 align-top text-xs font-semibold text-muted-foreground'>
                        <div>{areaLabel(item)}</div>
                        <div className='mt-1 text-[11px] text-muted-foreground/60'>
                          {item.areaWeightGsm.trim()
                            ? `${item.areaWeightGsm.trim()} g/m²`
                            : '未填写面密度'}
                        </div>
                        <div className='mt-1 text-[11px] text-muted-foreground/60'>
                          {weightLabel(item)}
                        </div>
                      </td>
                      <td className='px-4 py-3 align-top text-xs font-semibold text-muted-foreground'>
                        {formatSupportedCutAngleLabel(item.cutAngle)}
                      </td>
                      <td className='px-4 py-3 align-top text-xs font-semibold text-muted-foreground'>
                        {item.layupCount ? `${item.layupCount} 层` : '--'}
                        {item.layupMode ? ` / ${item.layupMode}` : ''}
                      </td>
                      <td className='px-4 py-3 align-top text-xs font-semibold text-muted-foreground'>
                        {item.usageType || '--'}
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <Badge
                          className={`rounded-full border text-[10px] font-black ${statusBadgeClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </Badge>
                      </td>
                      <td className='px-4 py-3 align-top'>
                        <div className='flex items-center gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => openEdit(item)}
                            className='size-8 rounded-full text-muted-foreground'
                          >
                            <Edit3 className='size-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            className='size-8 rounded-full text-muted-foreground hover:text-destructive'
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[88vh] overflow-y-auto rounded-[24px] sm:max-w-[980px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tight italic'>
              <Ruler className='size-5 text-primary' />
              {editingUnit ? '编辑裁切尺寸单元' : '新增裁切尺寸单元'}
            </DialogTitle>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-4 [&_input]:h-10 [&_input]:rounded-xl'>
            <Field label='尺寸编号' required>
              <Input
                value={form.code}
                onChange={(event) => updateForm('code', event.target.value)}
                placeholder='例如 CS-40-40-01'
              />
            </Field>
            <Field label='尺寸名称' required className='md:col-span-2'>
              <Input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder='例如 C0 主纱 40x40'
              />
            </Field>
            <Field label='状态'>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  updateForm('status', value as CutSizeUnitStatus)
                }
              >
                <SelectTrigger className='h-10 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Active'>启用</SelectItem>
                  <SelectItem value='Inactive'>停用</SelectItem>
                  <SelectItem value='Archived'>归档</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label='宽度 (mm)' required>
              <Input
                value={form.widthMm}
                onChange={(event) => updateForm('widthMm', event.target.value)}
                placeholder='40'
              />
            </Field>
            <Field label='长度 (mm)' required>
              <Input
                value={form.lengthMm}
                onChange={(event) => updateForm('lengthMm', event.target.value)}
                placeholder='40'
              />
            </Field>
            <Field label='张数' required>
              <Input
                value={form.pieceCount}
                onChange={(event) =>
                  updateForm('pieceCount', event.target.value)
                }
                placeholder='1'
              />
            </Field>
            <Field label='裁切角度'>
              <Select
                value={form.cutAngle}
                onValueChange={(value) => updateForm('cutAngle', value)}
              >
                <SelectTrigger className='h-10 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CUT_ANGLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label='面积 (m²)'>
              <Input
                value={resolvedFormAreaM2}
                readOnly
                disabled
                placeholder='按宽度×长度×张数自动计算'
              />
            </Field>
            <Field label='面密度 (g/m²)' required>
              <Input
                value={form.areaWeightGsm}
                onChange={(event) =>
                  updateForm('areaWeightGsm', event.target.value)
                }
                placeholder='例如 260'
              />
            </Field>
            <Field label='重量 (g)'>
              <Input
                value={resolvedFormWeightG}
                readOnly
                disabled
                placeholder='按面积×面密度自动换算'
              />
            </Field>

            <Field label='叠层数'>
              <Input
                value={form.layupCount}
                onChange={(event) =>
                  updateForm('layupCount', event.target.value)
                }
                placeholder='1'
              />
            </Field>
            <Field label='叠层模式'>
              <Input
                value={form.layupMode}
                onChange={(event) =>
                  updateForm('layupMode', event.target.value)
                }
                placeholder='例如 双层叠'
              />
            </Field>
            <Field label='用途类型'>
              <Input
                value={form.usageType}
                onChange={(event) =>
                  updateForm('usageType', event.target.value)
                }
                placeholder='例如 主纱 / 补强'
              />
            </Field>
            <div className='rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 md:col-span-4'>
              <div className='text-[10px] font-black tracking-[0.2em] text-primary/80 uppercase'>
                面积与重量口径
              </div>
              <div className='mt-2 grid gap-2 md:grid-cols-3'>
                <div className='rounded-xl bg-background/80 px-3 py-2 text-[11px] font-bold text-foreground/80'>
                  几何推导面积：{derivedAreaM2 ? `${derivedAreaM2} m²` : '--'}
                </div>
                <div className='rounded-xl bg-background/80 px-3 py-2 text-[11px] font-bold text-foreground/80'>
                  保存面积：
                  {resolvedFormAreaM2 ? `${resolvedFormAreaM2} m²` : '--'}
                </div>
                <div className='rounded-xl bg-background/80 px-3 py-2 text-[11px] font-bold text-foreground/80'>
                  当前面密度：
                  {form.areaWeightGsm.trim()
                    ? `${form.areaWeightGsm.trim()} g/m²`
                    : '--'}
                </div>
                <div className='rounded-xl bg-background/80 px-3 py-2 text-[11px] font-bold text-foreground/80'>
                  自动换算重量：
                  {resolvedFormWeightG ? `${resolvedFormWeightG} g` : '--'}
                </div>
              </div>
              <p className='mt-2 text-[10px] font-bold text-muted-foreground'>
                面积始终按宽度 × 长度 × 张数自动派生；重量按面积 ×
                面密度自动换算。
              </p>
            </div>
            <Field label='说明' className='md:col-span-4'>
              <Textarea
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                className='min-h-[74px] resize-none rounded-xl'
                placeholder='补充工艺说明、适用范围、约束条件'
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDialogOpen(false)}
              className='rounded-full px-6 font-black'
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className='rounded-full px-8 font-black'
            >
              {saveMutation.isPending ? '保存中...' : '保存尺寸单元'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-3'>
      <div className='text-2xl font-black tabular-nums'>{value}</div>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground'>
        {label}
      </div>
    </div>
  )
}
