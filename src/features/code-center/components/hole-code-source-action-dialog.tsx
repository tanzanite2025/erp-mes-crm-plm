'use client'

import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Database, Hash } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useHoleCodeSource } from '../hooks/use-hole-code-source'

interface HoleCodeSourceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const dialogShellClasses = buildActionDialogShellClasses({
  content:
    'w-[95vw] max-w-[calc(100vw-2rem)] gap-0 rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-[960px]',
  header:
    'border-b border-dashed border-muted/50 bg-muted/10 px-5 py-5 text-left sm:px-8 sm:py-7',
  body: 'bg-muted/20 p-5 sm:p-6',
  footer:
    'border-t border-dashed border-muted/50 bg-muted/5 px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  title: 'text-left',
  description:
    'mt-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60',
})

export function HoleCodeSourceActionDialog({
  open,
  onOpenChange,
}: HoleCodeSourceActionDialogProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: bundle, isLoading } = useHoleCodeSource()

  const prefixes = bundle?.prefixes ?? []
  const counts = bundle?.counts ?? []
  const activeCount =
    prefixes.filter((item) => item.active).length +
    counts.filter((item) => item.active).length

  const handleOpenHoleCodes = async () => {
    onOpenChange(false)
    await navigate({ to: '/code-center/shared-code-source/hole-codes' })
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-start gap-4'>
          <div className='flex size-14 shrink-0 items-center justify-center rounded-[20px] border border-primary/15 bg-primary/10 text-primary shadow-sm'>
            <Database className='size-6' />
          </div>
          <div className='space-y-1.5'>
            <div className='text-lg font-black tracking-tight italic sm:text-xl'>
              {t('codeCenter.sharedCodeSource.holeCodes.page.title')}
            </div>
            <div className='flex flex-wrap gap-2'>
              <Badge className='rounded-full border-none bg-primary/10 px-3 text-[9px] font-black tracking-[0.22em] text-primary/70 uppercase'>
                {t('codeCenter.sharedCodeSource.holeCodes.page.total', {
                  count: prefixes.length + counts.length,
                })}
              </Badge>
              <Badge className='rounded-full border-none bg-emerald-500/10 px-3 text-[9px] font-black tracking-[0.22em] text-emerald-600 uppercase'>
                {t('codeCenter.sharedCodeSource.holeCodes.page.active', {
                  count: activeCount,
                })}
              </Badge>
            </div>
          </div>
        </div>
      }
      description={t('codeCenter.sharedCodeSource.holeCodes.page.description')}
      contentClassName={dialogShellClasses.content}
      headerClassName={dialogShellClasses.header}
      bodyClassName={dialogShellClasses.body}
      footerClassName={dialogShellClasses.footer}
      titleClassName={dialogShellClasses.title}
      descriptionClassName={dialogShellClasses.description}
      footer={
        <>
          <Button
            variant='outline'
            onClick={() => void handleOpenHoleCodes()}
            className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
          >
            {t('codeCenter.sharedCodeSource.holeCodes.actions.gotoHoleCodes')}
            <ArrowRight className='ml-2 size-3.5' />
          </Button>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase hover:bg-muted/30'
          >
            {t('common.actions.close')}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/10 p-8 text-center text-[10px] font-black tracking-[0.3em] text-muted-foreground/60 uppercase'>
          {t('codeCenter.sharedCodeSource.holeCodes.states.loading')}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-[0.86fr_1.14fr]'>
          <section className='overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm ring-1 ring-muted/40'>
            <div className='flex items-start justify-between gap-4 border-b border-dashed border-muted/70 bg-primary/5 p-5'>
              <div className='space-y-1'>
                <div className='text-[11px] font-black tracking-widest text-primary uppercase'>
                  {t(
                    'codeCenter.sharedCodeSource.holeCodes.sections.prefix.title'
                  )}
                </div>
                <div className='text-[10px] leading-5 text-muted-foreground'>
                  {t(
                    'codeCenter.sharedCodeSource.holeCodes.sections.prefix.description'
                  )}
                </div>
              </div>
              <Badge className='rounded-full border-none bg-primary/10 px-3 text-[9px] font-black text-primary'>
                {prefixes.length}
              </Badge>
            </div>

            {prefixes.length > 0 ? (
              <div className='space-y-3 p-5'>
                {prefixes.map((item) => (
                  <div
                    key={item.id}
                    className='rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm transition-colors hover:border-primary/25 hover:bg-primary/5'
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-11 items-center justify-center rounded-2xl border border-primary/15 bg-background text-primary shadow-sm'>
                          <Hash className='size-4' />
                        </div>
                        <div>
                          <div className='font-mono text-base font-black tracking-tight text-foreground'>
                            {item.code}
                          </div>
                          <div className='text-[10px] font-bold text-muted-foreground'>
                            {item.label || item.code}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          item.active
                            ? 'border-none bg-emerald-500/10 text-emerald-600'
                            : 'border-none bg-muted text-muted-foreground'
                        }
                      >
                        {item.active
                          ? t(
                              'codeCenter.sharedCodeSource.holeCodes.states.enabled'
                            )
                          : t(
                              'codeCenter.sharedCodeSource.holeCodes.states.disabled'
                            )}
                      </Badge>
                    </div>
                    <div className='mt-4 rounded-2xl border border-dashed border-slate-200 bg-background/80 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
                      {item.description ||
                        t(
                          'codeCenter.sharedCodeSource.holeCodes.states.noDescription'
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='m-5 rounded-2xl border border-dashed border-muted/50 bg-background/80 p-6 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t(
                  'codeCenter.sharedCodeSource.holeCodes.sections.prefix.emptyTitle'
                )}
              </div>
            )}
          </section>

          <section className='overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm ring-1 ring-muted/40'>
            <div className='flex items-start justify-between gap-4 border-b border-dashed border-muted/70 bg-emerald-500/5 p-5'>
              <div className='space-y-1'>
                <div className='text-[11px] font-black tracking-widest text-emerald-700 uppercase'>
                  {t(
                    'codeCenter.sharedCodeSource.holeCodes.sections.count.title'
                  )}
                </div>
                <div className='text-[10px] leading-5 text-muted-foreground'>
                  {t(
                    'codeCenter.sharedCodeSource.holeCodes.sections.count.description'
                  )}
                </div>
              </div>
              <Badge className='rounded-full border-none bg-emerald-500/10 px-3 text-[9px] font-black text-emerald-700'>
                {counts.length}
              </Badge>
            </div>

            {counts.length > 0 ? (
              <div className='grid grid-cols-1 gap-3 p-5 sm:grid-cols-2'>
                {counts.map((item) => (
                  <div
                    key={item.id}
                    className='rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5'
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-11 items-center justify-center rounded-2xl border border-emerald-500/15 bg-background font-mono text-base font-black text-emerald-700 shadow-sm'>
                          {item.value}
                        </div>
                        <div>
                          <div className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            {t(
                              'codeCenter.sharedCodeSource.holeCodes.fields.holes'
                            )}
                          </div>
                          <div className='text-[10px] font-bold text-muted-foreground'>
                            {item.label || item.value}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          item.active
                            ? 'border-none bg-emerald-500/10 text-emerald-600'
                            : 'border-none bg-muted text-muted-foreground'
                        }
                      >
                        {item.active
                          ? t(
                              'codeCenter.sharedCodeSource.holeCodes.states.enabled'
                            )
                          : t(
                              'codeCenter.sharedCodeSource.holeCodes.states.disabled'
                            )}
                      </Badge>
                    </div>
                    <div className='mt-4 rounded-2xl border border-dashed border-slate-200 bg-background/80 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
                      {item.description ||
                        t(
                          'codeCenter.sharedCodeSource.holeCodes.states.noDescription'
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='m-5 rounded-2xl border border-dashed border-muted/50 bg-background/80 p-6 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t(
                  'codeCenter.sharedCodeSource.holeCodes.sections.count.emptyTitle'
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </ActionDialogShell>
  )
}
