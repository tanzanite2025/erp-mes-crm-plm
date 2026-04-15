'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ContactChannel, type ContactChannelType } from './contacts-page.types'

const CHANNEL_LABELS: Record<ContactChannelType, string> = {
  phone: '电话',
  wechat: '微信',
  email: '邮箱',
  whatsapp: 'WhatsApp',
  other: '其他',
}

type Props = {
  channel: ContactChannel
  index: number
  isPrimaryPhone?: boolean
  lockedPhone?: boolean
  onTypeChange?: (index: number, type: ContactChannelType) => void
  onValueChange: (index: number, value: string) => void
  onPrimaryChange: (index: number, primary: boolean) => void
  onRemove?: (index: number) => void
}

export function VehicleContactChannelRow({
  channel,
  index,
  isPrimaryPhone = false,
  lockedPhone = false,
  onTypeChange,
  onValueChange,
  onPrimaryChange,
  onRemove,
}: Props) {
  if (channel.type === 'phone' || lockedPhone) {
    return (
      <div className='grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/80 p-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center'>
        <Select value='phone' disabled>
          <SelectTrigger className='h-10 w-full rounded-xl border border-input bg-background/50 text-xs font-black shadow-sm disabled:cursor-not-allowed disabled:opacity-100'>
            <SelectValue placeholder='电话' />
          </SelectTrigger>
          <SelectContent className='rounded-xl border border-border/60 shadow-xl'>
            <SelectItem value='phone' className='rounded-lg px-3 py-2 text-xs font-bold'>{CHANNEL_LABELS.phone}</SelectItem>
          </SelectContent>
        </Select>
        <Input value={channel.value} onChange={(e) => onValueChange(index, e.target.value)} placeholder='主电话' className='h-10 rounded-xl text-xs font-bold' />
        <RadioGroup value={(isPrimaryPhone || channel.primary) ? 'primary' : ''} className='flex items-center justify-start'>
          <label className='flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-foreground'>
            <RadioGroupItem value='primary' onClick={() => onPrimaryChange(index, true)} />
            主项
          </label>
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className='grid gap-3 rounded-2xl border border-dashed border-border/60 bg-background/80 p-3 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center'>
      <Select value={channel.type} onValueChange={(value) => onTypeChange?.(index, value as ContactChannelType)}>
        <SelectTrigger className='h-10 w-full rounded-xl border border-input bg-background/50 text-xs font-black shadow-sm'>
          <SelectValue placeholder='联系方式类型' />
        </SelectTrigger>
        <SelectContent className='rounded-xl border border-border/60 shadow-xl'>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => <SelectItem key={value} value={value} className='rounded-lg px-3 py-2 text-xs font-bold'>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input value={channel.value} onChange={(e) => onValueChange(index, e.target.value)} placeholder='联系方式' className='h-10 rounded-xl text-xs font-bold' />
      <div className='flex flex-wrap items-center gap-2'>
        <label className='flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-[11px] font-black uppercase tracking-wide text-foreground'>
          <Checkbox checked={Boolean(channel.primary)} onCheckedChange={(checked) => onPrimaryChange(index, checked === true)} />
          主联系方式
        </label>
        {onRemove ? (
          <Button type='button' variant='outline' className='h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider' onClick={() => onRemove(index)}>
            删除
          </Button>
        ) : null}
      </div>
    </div>
  )
}
