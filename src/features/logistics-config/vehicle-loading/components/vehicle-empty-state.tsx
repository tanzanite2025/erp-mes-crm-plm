import { Card, CardContent } from '@/components/ui/card'

type Props = {
  title: string
  description: string
}

export function VehicleEmptyState({ title, description }: Props) {
  return (
    <Card className='rounded-[28px] border-dashed shadow-none bg-background/80'>
      <CardContent className='px-6 py-10 text-center'>
        <div className='text-sm font-black tracking-tight'>{title}</div>
        <div className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>{description}</div>
      </CardContent>
    </Card>
  )
}
