'use client'

import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Palette } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useAppearanceMapping } from '../hooks/use-appearance-mapping'

export type { AppearanceMapping } from '../data/appearance-mapping'

const dialogShellClasses = buildActionDialogShellClasses({
  content:
    'w-[95vw] max-w-[calc(100vw-2rem)] gap-0 rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-[960px]',
  header:
    'border-b border-dashed border-muted/50 bg-muted/10 px-5 py-5 text-left sm:px-8 sm:py-7',
  body: 'p-5 sm:p-6',
  footer:
    'border-t border-dashed border-muted/50 bg-muted/5 px-5 py-4 sm:px-6 sm:py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  title: 'text-left',
  description:
    'mt-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60',
})

interface AppearanceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppearanceActionDialog({
  open,
  onOpenChange,
}: AppearanceActionDialogProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { data: mapping } = useAppearanceMapping()

  const entries = Object.entries(mapping ?? {}).sort(
    ([left], [right]) => Number(left) - Number(right)
  )

  const handleOpenProductAppearance = async () => {
    onOpenChange(false)
    await navigate({ to: '/engineering/product-appearance' })
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-start gap-4'>
          <div className='flex size-14 shrink-0 items-center justify-center rounded-[20px] border border-primary/15 bg-primary/10 text-primary shadow-sm'>
            <Palette className='size-6' />
          </div>
          <div className='space-y-1.5'>
            <div className='text-lg font-black tracking-tight italic sm:text-xl'>
              {t('basicSettings.appearanceMapping.title')}
            </div>
            <div className='inline-flex rounded-full border border-dashed border-primary/20 bg-primary/5 px-3 py-1 text-[9px] font-black tracking-[0.22em] text-primary/70 uppercase'>
              {entries.length > 0 ? `${entries.length}` : '0'}
            </div>
          </div>
        </div>
      }
      description={t('basicSettings.appearanceMapping.description')}
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
            onClick={() => void handleOpenProductAppearance()}
            className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
          >
            {t('basicSettings.appearanceMapping.actions.gotoProductAppearance')}
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
      {entries.length > 0 ? (
        <div className='max-h-[58vh] overflow-y-auto pr-1 pb-2'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {entries.map(([key, item]) => (
              <div
                key={key}
                className='relative min-h-[150px] rounded-[22px] border border-dashed border-muted/50 bg-muted/5 p-4 shadow-sm transition-colors hover:border-primary/25 hover:bg-primary/3'
              >
                <div className='absolute top-4 right-4 flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-black text-primary-foreground shadow-lg shadow-primary/20'>
                  {key}
                </div>

                <div className='flex h-full flex-col gap-4 pr-12'>
                  <div className='flex items-center gap-3 text-primary'>
                    <div className='rounded-xl bg-primary/10 p-2'>
                      <Palette className='size-3.5' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                        {t('basicSettings.appearanceMapping.fields.label')}
                      </div>
                      <div className='truncate text-sm font-black text-foreground'>
                        {item.label || '-'}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <div className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('basicSettings.appearanceMapping.fields.description')}
                    </div>
                    <div className='line-clamp-2 rounded-2xl bg-background/85 px-3 py-2 text-[11px] leading-5 font-medium text-muted-foreground shadow-sm'>
                      {item.desc || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/10 p-8 text-center sm:p-10'>
          <div className='mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <Palette className='size-6' />
          </div>
          <div className='mt-5 text-[10px] font-black tracking-[0.3em] text-muted-foreground/60 uppercase'>
            {t('basicSettings.appearanceMapping.empty.title')}
          </div>
          <div className='mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground'>
            {t('basicSettings.appearanceMapping.empty.description')}
          </div>
        </div>
      )}
    </ActionDialogShell>
  )
}
