import { BrainCircuit } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  ENGINE_HERO_DESC_CLASS,
  ENGINE_HERO_OVERLAY_CLASS,
  ENGINE_HERO_SHELL_CLASS,
} from '../ui-classes'

export function EngineOverviewCard() {
  const { t } = useLanguage()

  return (
    <Card className={ENGINE_HERO_SHELL_CLASS}>
      <div className={ENGINE_HERO_OVERLAY_CLASS} />
      <CardHeader className='relative p-0'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2 text-cyan-600'>
            <BrainCircuit className='size-5' />
            <h3 className='text-lg font-black italic tracking-tighter uppercase'>{t('apsScheduling.engineConfig.title')}</h3>
          </div>
          <p className={ENGINE_HERO_DESC_CLASS}>{t('apsScheduling.engineConfig.subtitle')}</p>
        </div>
      </CardHeader>
    </Card>
  )
}
