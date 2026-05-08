import { ClipboardCheck, Hash, Info, Layers } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import type { Standard } from '../data/schema'
import {
  getQualityStandardStatusLabel,
  getQualityStandardTypeLabel,
  getStatusMeta,
} from '../utils/quality-utils'
import { StandardPreviewInfoCard } from './standard-preview-info-card'

interface StandardPreviewHeroProps {
  standard: Standard
}

export function StandardPreviewHero({ standard }: StandardPreviewHeroProps) {
  const { t } = useLanguage()
  const statusMeta = getStatusMeta(t, standard.status)

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3 lg:gap-4'>
          <div className='scale-90 rounded-xl border border-primary/20 bg-primary/10 p-2.5 shadow-inner lg:scale-100 lg:rounded-2xl lg:p-3.5'>
            <ClipboardCheck className='size-5 text-primary lg:size-8' />
          </div>
          <div className='min-w-0'>
            <h2 className='flex items-center gap-2 truncate text-lg font-black tracking-tighter uppercase lg:gap-3 lg:text-2xl'>
              {t('quality.standards.dialog.detail.title')}
              <span className='font-thin text-muted-foreground/30'>|</span>
              <span className='truncate text-primary'>{standard.code}</span>
            </h2>
            <p className='truncate text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-40 lg:text-[10px]'>
              {t('quality.standards.dialog.detail.subtitle')}
            </p>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-3 rounded-xl border border-white/5 bg-background/40 p-1.5'>
          <Badge className={`rounded-lg border-none px-3 py-1 text-[9px] font-black tracking-widest uppercase lg:px-4 lg:text-[10px] ${statusMeta.className}`}>
            {getQualityStandardStatusLabel(t, standard.status)}
          </Badge>
          <div className='h-3 w-px bg-white/10' />
          <span className='px-2 text-[9px] font-black text-muted-foreground uppercase opacity-60 lg:text-[10px]'>
            VERSION {standard.version.toFixed(1)}
          </span>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4'>
        <StandardPreviewInfoCard
          icon={Hash}
          label={t('quality.standards.dialog.detail.fields.code')}
          value={standard.code}
        />
        <StandardPreviewInfoCard
          icon={Layers}
          label={t('quality.standards.dialog.detail.fields.name')}
          value={standard.name}
          className='sm:col-span-2'
        />
        <StandardPreviewInfoCard
          icon={Info}
          label={t('quality.standards.dialog.detail.fields.type')}
          value={getQualityStandardTypeLabel(t, standard.type)}
          highlight
        />
      </div>
    </div>
  )
}
