'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVehicleSpecsQuery } from '@/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query'
import { createDefaultVehicleContactRemoteFilters } from './contact-filters.shared'
import { VehicleContactEditorDialog } from './vehicle-contact-editor-dialog'
import { ContactsListPanel } from './contacts-list-panel'
import { VehicleContactDeleteDialog } from './vehicle-contact-delete-dialog'
import { useVehicleContactBindings } from './hooks/use-vehicle-contact-bindings'
import { useVehicleContactActions } from './hooks/use-vehicle-contact-actions'
import { useVehicleContactUiFilters } from './hooks/use-vehicle-contact-filters'
import { type VehicleContactBinding } from './contacts-page.types'
import { vehicleContactQueryKeys } from './query-keys'
import { toVehicleContactSaveInput, toVehicleContactToggleInput } from './services/vehicle-contact-service'

export function ContactsPage() {
  const queryClient = useQueryClient()
  const { vehicleSpecs, isLoadingSpecs, specsError, specsStatus } = useVehicleSpecsQuery()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingBinding, setEditingBinding] = useState<VehicleContactBinding | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleContactBinding | null>(null)
  const defaultRemoteFilters = useMemo(() => createDefaultVehicleContactRemoteFilters(), [])

  const { bindings, loading, error, toastMessage, toastVariant, reload, showToast } = useVehicleContactBindings(defaultRemoteFilters)
  const { uiFilters, setUiFilters, filteredBindings, categoryLabels } = useVehicleContactUiFilters(bindings)
  const { saveBinding, deleteBinding } = useVehicleContactActions()

  const vehicleOptions = vehicleSpecs.map((spec) => ({ value: spec.id, label: spec.name }))

  const refreshVehicleContacts = async () => {
    await queryClient.invalidateQueries({ queryKey: vehicleContactQueryKeys.all() })
  }

  const openCreate = () => {
    setEditingBinding(null)
    setEditorOpen(true)
  }

  const openEdit = async (item: VehicleContactBinding) => {
    setEditingBinding(item)
    setEditorOpen(true)
  }

  const toggleEnabled = async (item: VehicleContactBinding) => {
    try {
      await saveBinding(toVehicleContactToggleInput(item, !item.enabled))
      await refreshVehicleContacts()
      showToast('保存成功', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  const requestDelete = (item: VehicleContactBinding) => {
    setDeleteTarget(item)
  }

  const emptyStateTitle = specsStatus === 'loading'
    ? '正在加载车型库'
    : specsStatus === 'forbidden'
      ? '权限不足，无法读取车型库'
      : specsStatus === 'failed'
        ? '车型接口加载失败'
        : vehicleOptions.length === 0
          ? '车型库暂无可绑定车型'
          : '还没有联系人绑定'

  const emptyStateDescription = specsStatus === 'loading'
    ? '正在从车型库接口获取可绑定车型，请稍候。'
    : specsStatus === 'forbidden'
      ? '当前账号没有读取车型库的权限，因此联系人页无法拿到可绑定车型。请联系管理员开放车型库查看权限。'
      : specsStatus === 'failed'
        ? `车型库接口异常，无法生成绑定下拉选项：${specsError?.message ?? '未知错误'}`
        : vehicleOptions.length === 0
          ? '车型接口已返回，但当前没有可用于联系人绑定的车型。请先到车型库确认是否启用并可见。'
          : '联系人绑定依附于车型库主数据，负责补充联系人、电话、渠道和调度备注。'

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBinding(deleteTarget.id)
      await refreshVehicleContacts()
      showToast('删除成功', 'success')
      setDeleteTarget(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <div className='flex flex-col gap-3 animate-in fade-in duration-500'>
      <PageHeader
        icon={Users}
        title='车型联系人'
        description='按车型维护联系人、电话、渠道与调度备注。'
      >
        <div className='uds-chip whitespace-nowrap px-2.5 py-1 text-[10px] leading-none'>{`绑定 ${filteredBindings.length}`}</div>
      </PageHeader>

      <Card className='rounded-2xl border border-dashed border-border/60 bg-background/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
        <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
          <div className='min-w-0'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>运行概览</div>
            <div className='mt-1 text-[11px] leading-5 text-muted-foreground'>当前视图保留筛选与统计，操作入口统一收敛到列表项。</div>
          </div>
          <div className='uds-chip whitespace-nowrap text-[10px] leading-none'>{`当前显示 ${filteredBindings.length}`}</div>
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-3'>
          <div className='rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>当前显示</div>
            <div className='mt-1.5 text-3xl font-black italic tracking-tighter text-foreground'>{filteredBindings.length}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>车型范围</div>
            <div className='mt-1.5 text-3xl font-black italic tracking-tighter text-foreground'>{vehicleOptions.length}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>状态筛选</div>
            <div className='mt-1.5 text-[11px] font-semibold leading-5 text-foreground'>启用 / 停用 / 全部</div>
          </div>
        </div>
      </Card>

      {toastMessage ? (
        <Card className={`rounded-2xl border px-5 py-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] ${toastVariant === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-destructive/40 bg-destructive/5 text-destructive'}`}>
          <div className='text-[10px] font-black uppercase tracking-widest'>提示</div>
          <div className='mt-1.5 text-[11px] leading-5 font-medium'>{toastMessage}</div>
        </Card>
      ) : null}

      <Card className='rounded-2xl border border-dashed border-border/60 bg-background/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
        <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>筛选面板</div>
            <div className='mt-1.5 text-[11px] leading-5 text-muted-foreground'>按类别、车型、状态快速定位联系人绑定。</div>
          </div>
        </div>
        <div className='grid gap-3 lg:grid-cols-4'>
          <Select value={uiFilters.category} onValueChange={(value) => setUiFilters((prev) => ({ ...prev, category: value as typeof uiFilters.category }))}>
            <SelectTrigger className='h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-[11px] shadow-none'>
              <SelectValue placeholder='全部类别' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部类别</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={uiFilters.vehicleId} onValueChange={(value) => setUiFilters((prev) => ({ ...prev, vehicleId: value }))}>
            <SelectTrigger className='h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-[11px] shadow-none'>
              <SelectValue placeholder='全部车型' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部车型</SelectItem>
              {vehicleOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={uiFilters.enabled} onValueChange={(value) => setUiFilters((prev) => ({ ...prev, enabled: value as typeof uiFilters.enabled }))}>
            <SelectTrigger className='h-10 w-full rounded-lg border border-border/60 bg-background px-3 text-[11px] shadow-none'>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='enabled'>启用</SelectItem>
              <SelectItem value='disabled'>停用</SelectItem>
            </SelectContent>
          </Select>
          <input
            className='h-10 rounded-lg border border-border/60 bg-background px-3 text-[11px] shadow-none'
            value={uiFilters.keyword}
            onChange={(e) => setUiFilters((prev) => ({ ...prev, keyword: e.target.value }))}
            placeholder='搜索联系人、电话、备注...'
          />
        </div>
      </Card>

      {specsError ? <Card className='rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 shadow-none'><div className='text-[10px] font-black uppercase tracking-widest text-destructive'>车型加载失败</div><div className='mt-1.5 text-[11px] leading-5 text-muted-foreground'>{specsError.message}</div></Card> : null}
      {error ? <Card className='rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 shadow-none'><div className='text-[10px] font-black uppercase tracking-widest text-destructive'>联系人加载失败</div><div className='mt-1.5 text-[11px] leading-5 text-muted-foreground'>{error.message}</div><button type='button' className='uds-chip mt-3 border-destructive/40 text-[10px] text-destructive' onClick={() => void reload()}>重新加载</button></Card> : null}
      {isLoadingSpecs || loading ? <Card className='rounded-2xl border border-border/60 bg-background/70 px-5 py-5 shadow-none'><div className='text-[10px] font-black uppercase tracking-widest'>数据加载中...</div></Card> : null}

      <div className='grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
        <Card className='rounded-2xl border border-dashed border-border/60 bg-background/90 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>分组导航</div>
              <div className='text-[11px] text-muted-foreground'>点击切换联系人类别</div>
            </div>
            <div className='rounded-full border border-border/60 px-3 py-1 text-[10px] font-black tracking-widest tabular-nums'>{filteredBindings.length}</div>
          </div>
          <div className='mt-4 space-y-2.5'>
            {Object.entries(categoryLabels).map(([value, label]) => {
              const count = filteredBindings.filter((item) => item.category === value).length
              return (
                <button key={value} type='button' className='flex w-full items-center justify-between rounded-lg border border-border/60 bg-background/70 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5' onClick={() => setUiFilters((prev) => ({ ...prev, category: value as typeof prev.category }))}>
                  <span className='text-[11px] font-semibold leading-5 text-foreground'>{label}</span>
                  <span className='rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[10px] font-black tracking-widest tabular-nums text-muted-foreground'>{count}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <ContactsListPanel
          bindings={filteredBindings}
          onEdit={(item) => void openEdit(item)}
          onToggleEnabled={(item) => void toggleEnabled(item)}
          onRequestDelete={requestDelete}
          onCreate={openCreate}
          onGoToVehicleCatalog={() => window.open('/logistics-config/vehicle-specs-library', '_blank', 'noopener,noreferrer')}
          vehicleSpecsLoading={isLoadingSpecs}
          vehicleSpecsError={specsError}
          vehicleSpecsStatus={specsStatus}
          vehicleOptionsCount={vehicleOptions.length}
          emptyStateTitle={emptyStateTitle}
          emptyStateDescription={emptyStateDescription}
        />
      </div>

      <VehicleContactEditorDialog open={editorOpen} binding={editingBinding} vehicleOptions={vehicleOptions} onOpenChange={setEditorOpen} onSaved={async (form) => {
        try {
          await saveBinding(toVehicleContactSaveInput(form, editingBinding?.id))
          await refreshVehicleContacts()
          showToast('保存成功', 'success')
        } catch (error) {
          showToast(error instanceof Error ? error.message : '保存失败', 'error')
          throw error
        }
      }} />
      <VehicleContactDeleteDialog target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  )
}
