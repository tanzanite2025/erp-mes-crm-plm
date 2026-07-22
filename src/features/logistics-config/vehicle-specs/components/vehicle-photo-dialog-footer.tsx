import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

type Props = {
  onClose: () => void
}

export function VehiclePhotoDialogFooter({ onClose }: Props) {
  const { t } = useLanguage()

  return (
    <div className='shrink-0 border-t border-dashed border-border/60 px-4 py-3'>
      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          className='h-9 rounded-xl text-[10px] font-black tracking-[0.18em] uppercase'
        >
          {t('common.actions.close')}
        </Button>
      </div>
    </div>
  )
}
