import {
  AlertTriangle,
  CheckCircle2,
  Siren,
  type LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  GreedyEngineFactorBadgeItem,
  GreedyEngineFactorSummaryItem,
  GreedyEngineFactorStatusTone,
} from '../types'
import {
  ENGINE_BADGE_CLASS,
  ENGINE_CARD_SHELL_CLASS,
  ENGINE_CARD_TITLE_CLASS,
  ENGINE_COMPACT_VALUE_CLASS,
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
      return (
        <CheckCircle2
          className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`}
        />
      )
    case 'critical':
      return (
        <Siren
          className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`}
        />
      )
    case 'alert':
    default:
      return (
        <AlertTriangle
          className={`${ENGINE_STATUS_ICON_CLASS} ${getEngineStatusTextToneClass(tone)}`}
        />
      )
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
      <CardHeader className='relative flex flex-col gap-2 p-3 pb-1.5'>
        <div className={`flex min-w-0 items-start gap-2 ${accentClassName}`}>
          <Icon className='mt-0.5 size-4 shrink-0' />
          <div className='min-w-0'>
            <CardTitle className={`${ENGINE_CARD_TITLE_CLASS} leading-none`}>
              {title}
            </CardTitle>
            <CardDescription className='mt-0.5 text-[8px] leading-tight font-black tracking-widest break-all whitespace-normal text-muted-foreground/50 uppercase'>
              {description}
            </CardDescription>
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`${ENGINE_BADGE_CLASS} ${getEngineStatusBadgeToneClass(badge.tone)} h-4 gap-1 px-2`}
            >
              <StatusIcon tone={badge.tone} />
              <span className='text-[8px] font-black tracking-[0.16em]'>
                {badge.value}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className='relative space-y-2 p-3 pt-0'>
        <div className='grid gap-1.5'>
          {summaryItems.map((item) => (
            <div
              key={item.id}
              className={`${ENGINE_PANEL_CLASS} ${item.tone ? getEngineStatusPanelToneClass(item.tone) : 'bg-background'} px-3 py-2`}
            >
              <div className='flex items-start justify-between gap-2'>
                <div className={`${ENGINE_KICKER_CLASS} pt-0.5`}>
                  {item.label}
                </div>
                <div
                  className={`flex items-start justify-end gap-1 text-right ${item.tone ? getEngineStatusTextToneClass(item.tone) : ''}`}
                >
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
