import { Badge } from '@/components/ui/badge'

/**
 * 获取状态徽章
 */
export function getStatusBadge(status: string) {
  switch (status) {
    case 'OPEN':
      return <Badge className='bg-blue-500/10 text-blue-600 border-blue-200 text-[8px] font-black'>待处理</Badge>
    case 'IN_PROGRESS':
      return <Badge className='bg-amber-500/10 text-amber-600 border-amber-200 text-[8px] font-black'>进行中</Badge>
    case 'COMPLETED':
      return <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[8px] font-black'>已完成</Badge>
    case 'CANCELLED':
      return <Badge className='bg-slate-500/10 text-slate-500 border-slate-200 text-[8px] font-black'>已取消</Badge>
    default:
      return <Badge className='text-[8px] font-black'>{status}</Badge>
  }
}

/**
 * 获取优先级徽章
 */
export function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return <Badge className='bg-rose-600 text-white text-[8px] font-black'>紧急</Badge>
    case 'HIGH':
      return <Badge className='bg-orange-500 text-white text-[8px] font-black'>高</Badge>
    case 'MEDIUM':
      return <Badge className='bg-blue-500 text-white text-[8px] font-black'>中</Badge>
    case 'LOW':
      return <Badge className='bg-slate-400 text-white text-[8px] font-black'>低</Badge>
    default:
      return <Badge className='text-[8px] font-black'>{priority}</Badge>
  }
}

/**
 * 获取类型徽章
 */
export function getTypeBadge(type: string) {
  switch (type) {
    case 'PREVENTIVE':
      return <Badge variant='outline' className='text-[8px] font-black'>预防性</Badge>
    case 'CORRECTIVE':
      return <Badge variant='outline' className='text-[8px] font-black'>纠正性</Badge>
    case 'INSPECTION':
      return <Badge variant='outline' className='text-[8px] font-black'>检查</Badge>
    default:
      return <Badge variant='outline' className='text-[8px] font-black'>{type}</Badge>
  }
}

/**
 * 格式化维保记录日期
 */
export function formatMaintenanceDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
