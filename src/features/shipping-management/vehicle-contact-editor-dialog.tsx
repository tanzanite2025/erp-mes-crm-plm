'use client'

import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  type ContactChannel,
  type ContactChannelType,
  type VehicleContactBinding,
  type VehicleContactBindingForm,
} from './vehicle-contact.types'
import { VehicleContactChannelRow } from './vehicle-contact-channel-row'

function toForm(binding?: VehicleContactBinding | null): VehicleContactBindingForm {
  const defaultChannels: ContactChannel[] = [{ type: 'phone', value: '', primary: true }]
  const channels = binding?.channels?.length ? binding.channels : defaultChannels
  const primaryPhone = channels.find((c) => c.type === 'phone' && c.primary)?.value ?? ''

  return {
    vehicleId: binding?.vehicleId ?? '',
    supplierName: binding?.supplierName ?? '',
    contactName: binding?.contactName ?? '',
    primaryPhone,
    channels,
    region: binding?.region ?? '',
    dispatchAdvice: binding?.dispatchAdvice ?? '',
    note: binding?.note ?? '',
    enabled: binding?.enabled ?? true,
  }
}

const PHONE_CHANNEL_TYPE_OPTIONS: ContactChannelType[] = ['phone']
const CHANNEL_TYPE_OPTIONS: ContactChannelType[] = ['phone', 'wechat', 'email', 'whatsapp', 'other']

type Props = {
  open: boolean
  binding?: VehicleContactBinding | null
  vehicleOptions: Array<{ value: string; label: string; category?: string }>
  onOpenChange: (open: boolean) => void
  onSaved: (form: VehicleContactBindingForm) => Promise<void> | void
}

export function VehicleContactEditorDialog({ open, binding, vehicleOptions, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<VehicleContactBindingForm>(toForm(binding))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(toForm(binding))
  }, [binding, open])

  const selectedVehicle = useMemo(() => vehicleOptions.find((item) => item.value === form.vehicleId), [form.vehicleId, vehicleOptions])
  
  const primaryPhoneCount = form.channels.filter((c) => c.type === 'phone' && c.primary).length
  const hasPhoneChannel = form.channels.some((c) => c.type === 'phone')

  const validationError = !form.vehicleId
    ? '请选择车型'
    : !form.contactName.trim()
      ? '请输入车型联系人'
      : !hasPhoneChannel
        ? '至少需要一个电话联系方式'
        : primaryPhoneCount !== 1
          ? '必须且只能有一个标为主项的电话'
          : !form.primaryPhone.trim()
            ? '主电话不能为空'
            : null

  if (!open) return null

  const updateFormField = <K extends keyof VehicleContactBindingForm>(field: K, value: VehicleContactBindingForm[K]) => {
    setForm((prev) => {
      const next = { ...prev }
      next[field] = value
      return next
    })
  }

  const getChannelRowUiState = (channel: ContactChannel) => {
    const isPhoneChannel = channel.type === 'phone'

    return {
      typeOptions: isPhoneChannel ? PHONE_CHANNEL_TYPE_OPTIONS : CHANNEL_TYPE_OPTIONS,
      isTypeLocked: isPhoneChannel,
      primaryControlMode: isPhoneChannel ? 'radio' : 'checkbox',
      isPrimarySelected: Boolean(channel.primary),
      primaryLabel: isPhoneChannel ? '主项' : '主联系方式',
      valuePlaceholder: isPhoneChannel ? '主电话' : '联系方式',
      showRemoveAction: !isPhoneChannel,
    } as const
  }

  const updateChannels = (
    buildNextChannels: (currentChannels: ContactChannel[], currentPrimaryPhone: string) => ContactChannel[]
  ) => {
    setForm((prev) => {
      const nextChannels = buildNextChannels(prev.channels, prev.primaryPhone)
      const nextPrimaryPhone = nextChannels.find((c) => c.type === 'phone' && c.primary)?.value ?? ''
      return {
        ...prev,
        primaryPhone: nextPrimaryPhone,
        channels: nextChannels,
      }
    })
  }

  const setChannelType = (index: number, type: ContactChannelType) => {
    updateChannels((currentChannels) =>
      currentChannels.map((channel, channelIndex) =>
        channelIndex === index ? { ...channel, type } : channel
      )
    )
  }

  const setChannelValue = (index: number, value: string) => {
    updateChannels((currentChannels) =>
      currentChannels.map((channel, channelIndex) =>
        channelIndex === index ? { ...channel, value } : channel
      )
    )
  }

  const setPrimaryChannel = (index: number, primary: boolean) => {
    updateChannels((currentChannels) =>
      currentChannels.map((channel, channelIndex) => {
        if (channel.type !== 'phone') return channel
        return { ...channel, primary: channelIndex === index ? primary : false }
      })
    )
  }

  const addChannel = () => {
    updateChannels((currentChannels) => [...currentChannels, { type: 'other', value: '', primary: false }])
  }

  const removeChannel = (index: number) => {
    updateChannels((currentChannels, currentPrimaryPhone) => {
      const nextChannels = currentChannels.filter((_, channelIndex) => channelIndex !== index)
      if (nextChannels.length === 0) {
        nextChannels.push({ type: 'phone', value: currentPrimaryPhone, primary: true })
      }
      return nextChannels
    })
  }

  const save = async () => {
    if (!form.vehicleId || !form.contactName.trim() || !selectedVehicle || validationError) return
    setSaving(true)
    try {
      await onSaved(form)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const shellClasses = buildActionDialogShellClasses({
    content: 'w-full max-w-3xl rounded-[28px] border-dashed p-0 shadow-2xl bg-background',
    header: 'flex items-start justify-between gap-4 p-6 pb-4 border-b border-dashed border-border/60 bg-muted/10',
    title: 'flex items-center gap-2 text-lg font-black normal-case not-italic tracking-normal',
    description: 'mt-1 text-sm text-muted-foreground font-medium uppercase tracking-normal opacity-100',
    body: 'p-6',
    footer: 'flex justify-end gap-2 p-6 pt-4 border-t border-dashed border-border/60 bg-muted/5',
  })

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <Users className='size-5 text-primary' />
          {binding ? '编辑车型联系人' : '新增车型联系人'}
        </>
      )}
      description='维护车型联系人、电话、渠道与调度备注。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <Button type='button' variant='ghost' className='rounded-xl px-6 font-black text-[11px] uppercase' onClick={() => onOpenChange(false)}>取消</Button>
          <Button type='button' className='rounded-xl px-10 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-primary/20' disabled={saving} onClick={() => void save()}>{saving ? '保存中...' : '保存'}</Button>
        </>
      )}
    >
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>车型</Label>
          <Select value={form.vehicleId || undefined} onValueChange={(value) => updateFormField('vehicleId', value)}>
            <SelectTrigger className='h-10 w-full rounded-xl border border-input bg-background/50 text-xs font-black shadow-sm'>
              <SelectValue placeholder='请选择车型' />
            </SelectTrigger>
            <SelectContent className='rounded-xl border border-border/60 shadow-xl'>
              {vehicleOptions.map((item) => <SelectItem key={item.value} value={item.value} className='rounded-lg px-3 py-2 text-xs font-bold'>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>供应商名称</Label>
          <Input value={form.supplierName} onChange={(e) => updateFormField('supplierName', e.target.value)} placeholder='可选' className='h-10 rounded-xl font-bold text-xs' />
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>车型联系人</Label>
          <Input value={form.contactName} onChange={(e) => updateFormField('contactName', e.target.value)} placeholder='必填' className='h-10 rounded-xl font-bold text-xs' />
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>主电话</Label>
          <div className='flex h-10 items-center rounded-xl border border-border/60 bg-muted/50 px-3 text-xs font-bold text-muted-foreground'>
            {form.primaryPhone || '请在下方联系方式中指定主电话'}
          </div>
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>区域</Label>
          <Input value={form.region} onChange={(e) => updateFormField('region', e.target.value)} placeholder='可选' className='h-10 rounded-xl font-bold text-xs' />
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>启用状态</Label>
          <Select value={String(form.enabled)} onValueChange={(value) => updateFormField('enabled', value === 'true')}>
            <SelectTrigger className='h-10 w-full rounded-xl border border-input bg-background/50 text-xs font-black shadow-sm'>
              <SelectValue placeholder='请选择状态' />
            </SelectTrigger>
            <SelectContent className='rounded-xl border border-border/60 shadow-xl'>
              <SelectItem value='true' className='rounded-lg px-3 py-2 text-xs font-bold'>启用</SelectItem>
              <SelectItem value='false' className='rounded-lg px-3 py-2 text-xs font-bold'>停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='mt-5 rounded-2xl border border-dashed border-border/60 p-4 bg-muted/5'>
        <div className='flex items-center justify-between'>
          <Label className='text-[10px] font-black uppercase ml-1'>联系方式</Label>
          <Button type='button' variant='outline' className='h-8 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider' onClick={addChannel}>添加联系方式</Button>
        </div>
        <div className='mt-2 text-[10px] uppercase font-bold tracking-wider opacity-60 ml-1'>
          电话项必须且只能有一个主项；主电话会自动提取并用于列表显示。
        </div>
        {validationError ? <div className='mt-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] font-bold text-destructive'>{validationError}</div> : null}
        <div className='mt-4 space-y-3'>
          {form.channels.map((channel, index) => (
            (() => {
              const rowUiState = getChannelRowUiState(channel)

              return (
                <VehicleContactChannelRow
                  key={`channel-${index}`}
                  channel={channel}
                  index={index}
                  typeOptions={rowUiState.typeOptions}
                  isTypeLocked={rowUiState.isTypeLocked}
                  primaryControlMode={rowUiState.primaryControlMode}
                  isPrimarySelected={rowUiState.isPrimarySelected}
                  primaryLabel={rowUiState.primaryLabel}
                  valuePlaceholder={rowUiState.valuePlaceholder}
                  showRemoveAction={rowUiState.showRemoveAction}
                  onTypeChange={setChannelType}
                  onValueChange={setChannelValue}
                  onPrimaryChange={setPrimaryChannel}
                  onRemove={removeChannel}
                />
              )
            })()
          ))}
        </div>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-2'>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>调度建议</Label>
          <textarea className='min-h-[96px] w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs font-medium shadow-sm outline-none focus:ring-1 focus:ring-primary' value={form.dispatchAdvice} onChange={(e) => updateFormField('dispatchAdvice', e.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase ml-1'>备注</Label>
          <textarea className='min-h-[96px] w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs font-medium shadow-sm outline-none focus:ring-1 focus:ring-primary' value={form.note} onChange={(e) => updateFormField('note', e.target.value)} />
        </div>
      </div>
    </ActionDialogShell>
  )
}
