import { FileClock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function LinearBarcodeStatusLifecycleStage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className='rounded-3xl border border-dashed border-muted/50 bg-background/70 p-4'>
      <div className='font-black text-foreground'>{title}</div>
      <p className='mt-2 leading-5 text-muted-foreground'>{description}</p>
    </div>
  )
}

export function LinearBarcodeStatusLifecycleFlowCard() {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-base font-black tracking-tight italic'>
          <FileClock className='size-4 text-primary' />
          {t('codeCenter.linearBarcode.status.flow.title')}
        </CardTitle>
        <CardDescription className='text-[11px] leading-5'>
          {t('codeCenter.linearBarcode.status.flow.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-3 text-[11px] md:grid-cols-3'>
          <LinearBarcodeStatusLifecycleStage
            title={t('codeCenter.linearBarcode.status.flow.printStageTitle')}
            description={t(
              'codeCenter.linearBarcode.status.flow.printStageDescription'
            )}
          />
          <LinearBarcodeStatusLifecycleStage
            title={t('codeCenter.linearBarcode.status.flow.bindingStageTitle')}
            description={t(
              'codeCenter.linearBarcode.status.flow.bindingStageDescription'
            )}
          />
          <LinearBarcodeStatusLifecycleStage
            title={t(
              'codeCenter.linearBarcode.status.flow.executionStageTitle'
            )}
            description={t(
              'codeCenter.linearBarcode.status.flow.executionStageDescription'
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
