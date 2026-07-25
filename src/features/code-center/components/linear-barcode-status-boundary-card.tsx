import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'

export function LinearBarcodeStatusBoundaryCard() {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[28px] border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardContent className='flex flex-col gap-3 p-5 md:flex-row md:items-start'>
        <ShieldCheck className='size-5 shrink-0 text-primary' />
        <div>
          <div className='text-sm font-black text-foreground'>
            {t('codeCenter.linearBarcode.status.boundary.title')}
          </div>
          <p className='mt-2 text-[11px] leading-5 text-muted-foreground'>
            {t('codeCenter.linearBarcode.status.boundary.description')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
