import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DrillingMetaSectionProps {
  id?: string
  createdAt?: string
}

export function DrillingMetaSection({
  id,
  createdAt,
}: DrillingMetaSectionProps) {
  return (
    <div className='grid grid-cols-2 gap-6 opacity-40 grayscale pointer-events-none'>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest'>系统编码 / INTERNAL_ID</Label>
        <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={id ?? '--'} />
      </div>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest'>创建时间 / CREATED_AT</Label>
        <Input readOnly className='h-10 font-mono text-xs bg-muted/20 border-none rounded-xl px-5' value={createdAt ?? '--'} />
      </div>
    </div>
  )
}
