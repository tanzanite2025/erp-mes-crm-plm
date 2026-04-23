import type { LucideIcon } from 'lucide-react'
import { Clock3, Download, ExternalLink, PackageCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TerminalCategory, TerminalGuide } from '../data'

interface TerminalConfigBoardProps {
  title: string
  description: string
  icon: LucideIcon
  sections: TerminalCategory[]
  summary: string
}

export function TerminalConfigBoard({
  title,
  description,
  icon,
  sections,
  summary,
}: TerminalConfigBoardProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader title={title} description={description} icon={icon} />

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        {sections.map((section) => {
          const SectionIcon = section.icon
          return (
            <Card key={section.title} className='rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
              <CardHeader className='pb-4'>
                <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
                  <SectionIcon className='size-4 text-primary' />
                  {section.title}
                </CardTitle>
                <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {section.items.map((item) => (
                  <div key={item.title} className='rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4 space-y-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <h4 className='text-sm font-black tracking-tight'>{item.title}</h4>
                        <p className='text-[10px] font-bold text-muted-foreground/60'>{item.target}</p>
                      </div>
                      <Badge
                        className={
                          item.status === 'pendingUpload'
                            ? 'bg-amber-500/10 text-amber-600 border-none'
                            : 'bg-emerald-500/10 text-emerald-600 border-none'
                        }
                      >
                        {item.status === 'pendingUpload'
                          ? t('terminalConfig.shared.statusPendingUpload')
                          : t('terminalConfig.shared.statusPlanned')}
                      </Badge>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground/70'>
                      <div>{`${t('terminalConfig.shared.versionLabel')}: ${item.version}`}</div>
                      <div>{`${t('terminalConfig.shared.packageTypeLabel')}: ${item.packageType}`}</div>
                    </div>
                    <p className='text-[11px] leading-relaxed text-muted-foreground/80'>{item.note}</p>
                    <div className='flex flex-wrap gap-2'>
                      <Button size='sm' disabled className='rounded-full text-[10px] font-black gap-2'>
                        <Download className='size-3.5' />
                        {t('terminalConfig.shared.downloadPending')}
                      </Button>
                      <Button size='sm' variant='outline' className='rounded-full text-[10px] font-black gap-2'>
                        <ExternalLink className='size-3.5' />
                        {t('terminalConfig.shared.viewGuide')}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className='rounded-[28px] border border-dashed border-muted/50 bg-background/70 p-5 md:p-6'>
        <div className='flex items-start gap-4'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground/75'>
            <PackageCheck className='size-4' />
          </div>
          <p className='max-w-5xl pt-1 text-[11px] md:text-xs leading-relaxed text-muted-foreground/80'>
            {summary}
          </p>
        </div>
      </div>
    </div>
  )
}

interface TerminalGuideBoardProps {
  title: string
  description: string
  icon: LucideIcon
  guides: TerminalGuide[]
}

export function TerminalGuideBoard({ title, description, icon, guides }: TerminalGuideBoardProps) {
  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader title={title} description={description} icon={icon} />

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        {guides.map((guide) => (
          <Card key={guide.title} className='rounded-[28px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2'>
                <Clock3 className='size-4 text-primary' />
                {guide.title}
              </CardTitle>
              <CardDescription className='text-[10px] md:text-[11px] font-medium text-muted-foreground/70'>
                {guide.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className='space-y-3'>
                {guide.points.map((point) => (
                  <li key={point} className='text-[12px] leading-relaxed text-muted-foreground/85 pl-4 relative'>
                    <span className='absolute left-0 top-1.5 size-1.5 rounded-full bg-primary/60' />
                    {point}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
