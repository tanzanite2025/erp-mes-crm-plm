import { Layers3 } from 'lucide-react'
import { CardHeader, CardTitle } from '@/components/ui/card'

type ProcessModuleHeaderProps = {
  title: string
  subtitle: string
}

export function ProcessModuleHeader({
  title,
  subtitle,
}: ProcessModuleHeaderProps) {
  return (
    <CardHeader className='border-b border-dashed border-muted/50 pb-5'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2 text-primary'>
          <Layers3 className='size-4' />
          <CardTitle className='text-base font-black tracking-tighter text-slate-800 italic'>
            {title}
          </CardTitle>
        </div>
        <p className='text-[10px] font-black tracking-widest text-muted-foreground/60'>
          {subtitle}
        </p>
      </div>
    </CardHeader>
  )
}
