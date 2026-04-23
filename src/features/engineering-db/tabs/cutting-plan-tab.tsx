import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  Layers3,
  Plus,
  Printer,
  Scissors,
  Search,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CuttingPlanEditor } from '../components/cutting-plan-editor'
import {
  buildCuttingPlanInput,
  buildCuttingPlanName,
  EMPTY_CUTTING_PLAN_INPUT,
  type CuttingPlan,
  type CuttingPlanInput,
} from '../data/cutting-plan-schema'
import { useCuttingPlanImportExport } from '../hooks/use-cutting-plan-import-export'
import { ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY } from '../query-keys'
import { CuttingPlanService } from '../services/cutting-plan-service'

export function CuttingPlanTab() {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CuttingPlan | null>(null)
  const [draft, setDraft] = useState<CuttingPlanInput>(EMPTY_CUTTING_PLAN_INPUT)
  const { downloadTemplate, parseExcel, exportPrint, previewPrint } = useCuttingPlanImportExport()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY,
    queryFn: CuttingPlanService.list,
  })

  const filteredPlans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return plans

    return plans.filter((plan) =>
      [
        plan.name,
        plan.productCode,
        plan.productName,
        plan.holeCount,
        plan.documentNo,
        plan.carbonFiberModel,
        plan.resinModel,
      ].some((value) => value?.toLowerCase().includes(keyword)),
    )
  }, [plans, searchTerm])

  const saveMutation = useMutation({
    mutationFn: () => CuttingPlanService.save(buildCuttingPlanInput(draft), editingPlan?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY })
      toast.success(editingPlan ? '裁纱方案已更新' : '裁纱方案已创建')
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CuttingPlanService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY })
      toast.success('裁纱方案已删除')
    },
  })

  const activeCount = plans.filter((plan) => plan.status === 'Active').length
  const lineCount = plans.reduce((total, plan) => total + plan.lines.length, 0)

  const openCreate = () => {
    setEditingPlan(null)
    setDraft(EMPTY_CUTTING_PLAN_INPUT)
    setDialogOpen(true)
  }

  const openEdit = (plan: CuttingPlan) => {
    setEditingPlan(plan)
    setDraft(buildCuttingPlanInput(plan))
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingPlan(null)
    setDraft(EMPTY_CUTTING_PLAN_INPUT)
  }

  const handleSave = () => {
    if (!draft.productId) {
      toast.error('请先选择或匹配产品型号')
      return
    }
    if (!draft.holeCount) {
      toast.error('请先选择孔数')
      return
    }
    const generatedName = buildCuttingPlanName({
      productName: draft.productName,
      productCode: draft.productCode,
      holeCount: draft.holeCount,
    })
    if (!generatedName) {
      toast.error('方案名称生成失败，请检查产品型号和孔数')
      return
    }
    saveMutation.mutate()
  }

  const handleImportFile = async (file: File) => {
    const parsed = await parseExcel(file)
    if (!parsed) return
    setEditingPlan(null)
    setDraft(parsed)
    setDialogOpen(true)
  }

  return (
    <div className='flex animate-in flex-col gap-5 fade-in duration-700'>
      <IndustrialHeader
        icon={Scissors}
        title='裁纱方案'
        description='导入模板按机器解析设计，只录入必要字段。打印导出会自动补齐完整表头和展示版式，便于现场流转与归档。'
        gradient
        innerClassName='text-rose-600'
        className='border-muted-foreground/10'
        statusBadge={
          <div className='grid grid-cols-3 gap-2 text-center md:min-w-[360px]'>
            <Metric label='方案数' value={plans.length} />
            <Metric label='启用' value={activeCount} />
            <Metric label='裁片行' value={lineCount} />
          </div>
        }
      />

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='relative w-full md:max-w-md'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='搜索方案、文件编号、产品、孔数、碳丝型号'
            className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-semibold shadow-inner'
          />
        </div>

        <div className='flex flex-wrap items-center justify-end gap-2'>
          <input
            ref={importInputRef}
            type='file'
            accept='.xlsx,.xls'
            className='hidden'
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleImportFile(file)
                event.target.value = ''
              }
            }}
          />
          <Button variant='outline' onClick={downloadTemplate} className='h-11 rounded-full px-5 text-xs font-black'>
            <Download className='size-4' />
            下载模板
          </Button>
          <Button
            variant='outline'
            onClick={() => importInputRef.current?.click()}
            className='h-11 rounded-full px-5 text-xs font-black'
          >
            <Upload className='size-4' />
            导入模板
          </Button>
          <Button onClick={openCreate} className='h-11 rounded-full px-6 text-xs font-black'>
            <Plus className='size-4' />
            新增裁纱方案
          </Button>
        </div>
      </div>

      <div className='grid gap-3'>
        {isLoading ? (
          <div className='rounded-[24px] border border-dashed border-muted-foreground/15 p-10 text-center text-xs font-black tracking-widest text-muted-foreground'>
            正在加载裁纱方案...
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className='rounded-[24px] border border-dashed border-muted-foreground/15 p-12 text-center'>
            <p className='text-sm font-black'>还没有裁纱方案</p>
            <p className='mt-1 text-xs font-semibold text-muted-foreground'>
              可以先下载模板批量导入，再在弹窗里核对后保存。
            </p>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className='rounded-[24px] border border-dashed border-muted-foreground/15 bg-background p-4 shadow-sm'
            >
              <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                <button type='button' onClick={() => openEdit(plan)} className='min-w-0 flex-1 text-left'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-base font-black tracking-tight'>{plan.name}</span>
                    <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black'>
                      {plan.status === 'Active' ? '启用' : plan.status === 'Archived' ? '归档' : '草稿'}
                    </Badge>
                    {plan.documentNo ? (
                      <Badge className='rounded-full bg-primary/10 text-[10px] font-black text-primary'>
                        {plan.documentNo}
                      </Badge>
                    ) : null}
                  </div>
                  <div className='mt-2 grid gap-2 text-xs font-semibold text-muted-foreground md:grid-cols-4'>
                    <Info
                      icon={FileSpreadsheet}
                      label='产品'
                      value={
                        plan.holeCount
                          ? `${plan.productName || plan.productCode || '--'} / ${plan.holeCount}孔`
                          : (plan.productName || plan.productCode || '--')
                      }
                    />
                    <Info
                      icon={CalendarDays}
                      label='版次/生效'
                      value={`${plan.revisionNo || '--'} / ${plan.effectiveDate || '--'}`}
                    />
                    <Info icon={Layers3} label='材料' value={plan.carbonFiberModel || '--'} />
                    <Info icon={Scissors} label='裁片行' value={`${plan.lines.length} 行`} />
                  </div>
                </button>

                <div className='flex flex-wrap items-center justify-end gap-1.5'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => void previewPrint(buildCuttingPlanInput(plan))}
                    className='h-8 rounded-full px-3 text-[11px] font-black'
                  >
                    <Printer className='size-3.5' />
                    打印预览
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => void exportPrint(buildCuttingPlanInput(plan))}
                    className='h-8 rounded-full px-3 text-[11px] font-black'
                  >
                    <Download className='size-3.5' />
                    下载打印版
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => deleteMutation.mutate(plan.id)}
                    disabled={deleteMutation.isPending}
                    className='rounded-full text-muted-foreground hover:text-destructive'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-h-[88vh] overflow-y-auto rounded-[24px] sm:max-w-[1180px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-xl font-black italic tracking-tighter'>
              <Scissors className='size-5 text-primary' />
              {editingPlan ? '编辑裁纱方案' : '新增裁纱方案'}
            </DialogTitle>
          </DialogHeader>

          <CuttingPlanEditor value={draft} onChange={setDraft} />

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => void previewPrint(buildCuttingPlanInput(draft))}
              className='rounded-full px-5 font-black'
            >
              <Printer className='size-4' />
              打印预览
            </Button>
            <Button
              variant='outline'
              onClick={() => void exportPrint(buildCuttingPlanInput(draft))}
              className='rounded-full px-5 font-black'
            >
              <Download className='size-4' />
              下载打印版
            </Button>
            <Button variant='outline' onClick={closeDialog} className='rounded-full px-6 font-black'>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className='rounded-full px-8 font-black'>
              {saveMutation.isPending ? '保存中...' : '保存方案'}
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
      <div className='text-2xl font-black tabular-nums'>{value}</div>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground'>{label}</div>
    </div>
  )
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className='flex min-w-0 items-center gap-2 rounded-2xl bg-muted/30 px-3 py-2'>
      <Icon className='size-4 shrink-0 text-primary/60' />
      <div className='min-w-0'>
        <div className='text-[9px] font-black tracking-widest text-muted-foreground'>{label}</div>
        <div className='truncate text-xs font-black text-foreground'>{value}</div>
      </div>
    </div>
  )
}
