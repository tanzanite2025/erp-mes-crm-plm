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
    <div className='pointer-events-none grid grid-cols-2 gap-6 opacity-40 grayscale'>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black tracking-widest uppercase'>
          系统编码 / INTERNAL_ID
        </Label>
        <Input
          readOnly
          className='h-10 rounded-xl border-none bg-muted/20 px-5 font-mono text-xs'
          value={id ?? '--'}
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-[10px] font-black tracking-widest uppercase'>
          创建时间 / CREATED_AT
        </Label>
        <Input
          readOnly
          className='h-10 rounded-xl border-none bg-muted/20 px-5 font-mono text-xs'
          value={createdAt ?? '--'}
        />
      </div>
    </div>
  )
}
