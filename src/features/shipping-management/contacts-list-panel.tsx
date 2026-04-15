import { Plus, MapPinned } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type VehicleSpecsLoadState } from '@/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query'
import { type VehicleCategory, type VehicleContactBinding } from './contacts-page.types'

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  van: '面包车',
  boxTruck: '厢式货车',
  lightTruck: '轻卡',
  mediumTruck: '中卡',
}

type Props = {
  bindings: VehicleContactBinding[]
  onEdit: (item: VehicleContactBinding) => void
  onToggleEnabled: (item: VehicleContactBinding) => void
  onRequestDelete: (item: VehicleContactBinding) => void
  onCreate: () => void
  onGoToVehicleCatalog: () => void
  vehicleSpecsLoading: boolean
  vehicleSpecsError: Error | null
  vehicleSpecsStatus: VehicleSpecsLoadState
  vehicleOptionsCount: number
  emptyStateTitle: string
  emptyStateDescription: string
}

export function ContactsListPanel({
  bindings,
  onEdit,
  onToggleEnabled,
  onRequestDelete,
  onCreate,
  onGoToVehicleCatalog,
  vehicleSpecsLoading,
  vehicleSpecsError,
  vehicleSpecsStatus,
  vehicleOptionsCount,
  emptyStateTitle,
  emptyStateDescription,
}: Props) {
  if (bindings.length === 0) {
    return (
      <Card className='rounded-2xl border border-dashed border-border/60 bg-background/90 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
        {vehicleSpecsStatus === 'failed' && vehicleSpecsError ? (
          <div className='mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-destructive'>
            <div className='text-[10px] font-black uppercase tracking-widest'>车型加载失败</div>
            <div className='mt-1.5 text-[11px] leading-5 text-muted-foreground'>{vehicleSpecsError.message}</div>
          </div>
        ) : null}
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center'>
          <div className='space-y-4'>
            <div className='inline-flex rounded-full border border-border/60 bg-background px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
              空状态引导
            </div>
            <div>
              <div className='text-[18px] font-black italic tracking-tighter text-foreground'>{emptyStateTitle}</div>
              <div className='mt-2 max-w-2xl text-[10px] leading-5 text-muted-foreground'>{emptyStateDescription}</div>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>步骤 01</div>
                <div className='mt-1 text-[11px] font-medium leading-5 text-foreground'>先确认车型库接口能正常返回车型</div>
              </div>
              <div className='rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>步骤 02</div>
                <div className='mt-1 text-[11px] font-medium leading-5 text-foreground'>再给车型补充联系人、电话和调度备注</div>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button type='button' size='sm' className='h-9 rounded-lg px-4 shadow-none text-[10px] font-black uppercase tracking-widest' onClick={onCreate} disabled={vehicleSpecsLoading || vehicleSpecsStatus === 'forbidden' || vehicleSpecsStatus === 'failed' || vehicleOptionsCount === 0}>
                <Plus className='mr-2 size-4' />
                立即新增
              </Button>
              <Button type='button' variant='outline' size='sm' className='h-9 rounded-lg border-dashed px-4 shadow-none text-[10px] font-black uppercase tracking-widest' onClick={onGoToVehicleCatalog}>
                <MapPinned className='mr-2 size-4' />
                车型库
              </Button>
            </div>
          </div>
          <div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>当前状态</div>
            <div className='mt-3 space-y-2.5 text-[10px] leading-5 text-muted-foreground'>
              <div className='rounded-lg border border-border/50 bg-muted/10 px-4 py-3'>
                车型库负责管理车型定义、规格和可用范围。
              </div>
              <div className='rounded-lg border border-border/50 bg-primary/5 px-4 py-3 text-foreground'>
                联系人管理只负责给已存在车型追加联系人绑定。
              </div>
              <div className='rounded-lg border border-border/50 bg-background px-4 py-3'>
                状态类型：<span className='font-semibold text-foreground'>{vehicleSpecsStatus === 'forbidden' ? '权限不足' : vehicleSpecsStatus === 'failed' ? '接口失败' : vehicleSpecsStatus === 'empty' ? '空目录' : vehicleSpecsStatus === 'loading' ? '加载中' : '正常'}</span>
              </div>
              <div className='rounded-lg border border-border/50 bg-background px-4 py-3'>
                可绑定车型数量：<span className='font-semibold text-foreground'>{vehicleOptionsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>联系人列表</div>
          <div className='mt-1.5 text-[10px] leading-5 text-muted-foreground'>当前显示 {bindings.length} 条记录</div>
        </div>
      </div>

      {bindings.map((item) => (
        <Card key={item.id} className='rounded-2xl border border-border/60 bg-background/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
              <div className='text-[18px] font-black italic tracking-tighter text-foreground'>{item.contactName}</div>
              <div className='text-sm leading-5 text-muted-foreground'>{item.vehicleName}</div>
              <div className='flex flex-wrap gap-2'>
                <Badge className='border border-primary/20 bg-primary/8 px-2 py-0 text-[10px] font-black uppercase tracking-widest leading-none text-primary'>{CATEGORY_LABELS[item.category]}</Badge>
                <Badge variant='outline' className='border-dashed px-2 py-0 text-[10px] font-black uppercase tracking-widest leading-none'>{item.enabled ? '启用' : '停用'}</Badge>
                {item.region ? <Badge variant='outline' className='border-dashed px-2 py-0 text-[10px] font-black uppercase tracking-widest leading-none'>{item.region}</Badge> : null}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button type='button' variant='outline' size='sm' className='h-9 rounded-lg border-dashed px-3 text-[10px] font-black uppercase tracking-widest shadow-none' onClick={() => onEdit(item)}>编辑</Button>
              <Button type='button' variant='outline' size='sm' className='h-9 rounded-lg border-dashed px-3 text-[10px] font-black uppercase tracking-widest shadow-none' onClick={() => onToggleEnabled(item)}>{item.enabled ? '停用' : '启用'}</Button>
              <Button type='button' variant='outline' size='sm' className='h-9 rounded-lg border-dashed px-3 text-[10px] font-black uppercase tracking-widest shadow-none text-destructive' onClick={() => onRequestDelete(item)}>删除</Button>
            </div>
          </div>

          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            <div className='rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>联系方式</div>
              <div className='mt-2 space-y-1.5 text-sm leading-5 text-foreground'>
                {item.channels.map((channel) => (
                  <div key={`${channel.type}-${channel.value}`} className='flex flex-wrap items-center gap-2'>
                    <span className='text-muted-foreground text-[11px]'>{channel.type}</span>
                    <span className='font-medium text-[11px]'>{channel.value}</span>
                    {channel.primary ? <span className='uds-chip text-[10px] leading-none'>主</span> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className='rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-sm'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>调度备注</div>
              <div className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>{item.dispatchAdvice ?? item.note ?? '—'}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
