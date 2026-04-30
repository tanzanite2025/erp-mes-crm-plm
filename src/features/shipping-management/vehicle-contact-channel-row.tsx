'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ContactChannel, type ContactChannelType } from './vehicle-contact.types'

const CHANNEL_LABELS: Record<ContactChannelType, string> = {
  phone: '电话',
  wechat: '微信',
  email: '邮箱',
  whatsapp: 'WhatsApp',
  other: '其他',
}

type PrimaryControlMode = 'radio' | 'checkbox'

type Props = {
  channel: ContactChannel
  index: number
  typeOptions: ContactChannelType[]
  isTypeLocked?: boolean
  primaryControlMode?: PrimaryControlMode
  isPrimarySelected?: boolean
  primaryLabel?: string
  valuePlaceholder?: string
  showRemoveAction?: boolean
  onTypeChange?: (index: number, type: ContactChannelType) => void
  onValueChange: (index: number, value: string) => void
  onPrimaryChange: (index: number, primary: boolean) => void
  onRemove?: (index: number) => void
}

export function VehicleContactChannelRow({
  channel,
  index,
  typeOptions,
  isTypeLocked = false,
  primaryControlMode = 'checkbox',
  isPrimarySelected = false,
  primaryLabel = '主联系方式',
  valuePlaceholder = '联系方式',
  showRemoveAction = false,
  onTypeChange,
  onValueChange,
  onPrimaryChange,
  onRemove,
}: Props) {
  return (
    <div className='grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/80 p-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center'>
      <Select value={channel.type} onValueChange={(value) => onTypeChange?.(index, value as ContactChannelType)} disabled={isTypeLocked}>
        <SelectTrigger className='h-10 w-full rounded-xl border border-input bg-background/50 text-xs font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-100'>
          <SelectValue placeholder='联系方式类型' />
        </SelectTrigger>
        <SelectContent className='rounded-xl border border-border/60 shadow-xl'>
          {typeOptions.map((value) => <SelectItem key={value} value={value} className='rounded-lg px-3 py-2 text-xs font-bold'>{CHANNEL_LABELS[value]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input value={channel.value} onChange={(e) => onValueChange(index, e.target.value)} placeholder={valuePlaceholder} className='h-10 rounded-xl text-xs font-bold' />
      <div className='flex flex-wrap items-center gap-2'>
        {primaryControlMode === 'radio' ? (
          <RadioGroup value={isPrimarySelected ? 'primary' : ''} className='flex items-center justify-start'>
            <label className='flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-foreground'>
              <RadioGroupItem value='primary' onClick={() => onPrimaryChange(index, true)} />
              {primaryLabel}
            </label>
          </RadioGroup>
        ) : (
          <label className='flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-[11px] font-black uppercase tracking-wide text-foreground'>
            <Checkbox checked={isPrimarySelected} onCheckedChange={(checked) => onPrimaryChange(index, checked === true)} />
            {primaryLabel}
          </label>
        )}
        {showRemoveAction && onRemove ? (
          <Button type='button' variant='outline' className='h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider' onClick={() => onRemove(index)}>
            删除
          </Button>
        ) : null}
      </div>
    </div>
  )
}
