import { Badge } from '@/components/ui/badge'

type Props = {
  activeFilters: Array<{ label: string; value: string }>
}

export function PlanOverviewFilterTags({ activeFilters }: Props) {
  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      {activeFilters.map((item) => (
        <Badge key={`${item.label}-${item.value}`} className='border-none bg-white/70 text-primary'>
          {item.label}：{item.value}
        </Badge>
      ))}
    </div>
  )
}
