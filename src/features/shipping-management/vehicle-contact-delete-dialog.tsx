import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { type VehicleContactBinding } from './vehicle-contact.types'

type Props = {
  target: VehicleContactBinding | null
  onCancel: () => void
  onConfirm: () => void
}

export function VehicleContactDeleteDialog({ target, onCancel, onConfirm }: Props) {
  if (!target) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4'>
      <Card className='w-full max-w-lg rounded-[28px] border-dashed bg-background p-6 shadow-2xl'>
        <div className='text-lg font-black'>确认删除车型联系人</div>
        <div className='mt-2 text-sm text-muted-foreground'>
          确认删除 <span className='font-semibold text-foreground'>{target.contactName}</span> 吗？删除后会同步到数据库，且该记录会被软删除。
        </div>
        <div className='mt-6 flex justify-end gap-2'>
          <Button type='button' variant='outline' className='rounded-full' onClick={onCancel}>取消</Button>
          <Button type='button' variant='destructive' className='rounded-full' onClick={onConfirm}>确认删除</Button>
        </div>
      </Card>
    </div>
  )
}
