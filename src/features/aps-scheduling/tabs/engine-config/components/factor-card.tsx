import { AlertTriangle, CheckCircle2, Siren, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { GreedyEngineFactorBadgeItem, GreedyEngineFactorSummaryItem, GreedyEngineFactorStatusTone } from '../types'
import {
  ENGINE_BADGE_CLASS,
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
  ENGINE_COMPACT_VALUE_CLASS,
  ENGINE_DESC_CLASS,
  ENGINE_KICKER_CLASS,
  ENGINE_PANEL_CLASS,
  ENGINE_STATUS_ICON_CLASS,
  getEngineStatusBadgeToneClass,
  getEngineStatusPanelToneClass,
  getEngineStatusTextToneClass,
} from '../ui-classes'

type FactorCardProps = {
  icon: LucideIcon
  title: string
  description: string
  badges: GreedyEngineFactorBadgeItem[]
  summaryItems: GreedyEngineFactorSummaryItem[]
  accentClassName?: string
}

function StatusIcon({ tone }: { tone: GreedyEngineFactorStatusTone }) {
  switch (tone) {
    case 'healthy':
      return <CheckCircle2 className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`} />
    case 'critical':
      return <Siren className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`} />
    case 'alert':
    default:
      return <AlertTriangle className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`} />
  }
}

export function FactorCard({
  icon: Icon,
  title,
  description,
  badges,
  summaryItems,
  accentClassName = 'text-cyan-700',
}: FactorCardProps) {
  return (
    <Card className={`${ENGINE_CARD_SHELL_CLASS} h-fit bg-muted/5`}>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      <CardHeader className='relative gap-4 pb-4'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className={`flex min-w-0 items-start gap-3 ${accentClassName}`}>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-[22px] border border-dashed border-primary/20 bg-background shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)]'>
              <Icon className='size-5' />
            </div>
            <div className='min-w-0 pt-0.5'>
              <CardTitle className={ENGINE_CARD_TITLE_CLASS}>{title}</CardTitle>
              <CardDescription className={ENGINE_DESC_CLASS}>{description}</CardDescription>
            </div>
          </div>
          <div className='flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[44%] lg:justify-end'>
            {badges.map((badge) => (
              <div key={badge.id} className={`${ENGINE_BADGE_CLASS} ${getEngineStatusBadgeToneClass(badge.tone)} gap-1.5`}>
                <StatusIcon tone={badge.tone} />
                <span className='font-black tracking-[0.16em]'>{badge.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className='relative space-y-3 pt-0'>
        <div className='grid gap-2.5'>
          {summaryItems.map((item) => (
            <div
              key={item.id}
              className={`${ENGINE_PANEL_CLASS} ${item.tone ? getEngineStatusPanelToneClass(item.tone) : 'bg-background'} px-4 py-3.5`}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className={`${ENGINE_KICKER_CLASS} pt-0.5`}>{item.label}</div>
                <div className={`flex items-start justify-end gap-1.5 text-right ${item.tone ? getEngineStatusTextToneClass(item.tone) : ''}`}>
                  {item.tone ? <StatusIcon tone={item.tone} /> : null}
                  <div className={ENGINE_COMPACT_VALUE_CLASS}>{item.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
