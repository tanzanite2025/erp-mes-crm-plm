import { Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'

type Props = {
  onClick: () => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
}

export function VehiclePhotoTriggerButton({
  onClick,
  className,
  size = 'sm',
  variant = 'outline',
}: Props) {
  const { t } = useLanguage()

  return (
    <Button
      type='button'
      size={size}
      variant={variant}
      onClick={onClick}
      className={cn('gap-2 border-dashed px-3 text-[10px] font-black uppercase tracking-[0.18em]', className)}
    >
      <Images className='size-4' />
      {t('logisticsConfig.vehiclePhotos.viewButton')}
    </Button>
  )
}
