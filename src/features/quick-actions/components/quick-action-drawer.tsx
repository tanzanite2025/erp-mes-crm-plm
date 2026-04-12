'use client'

import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { useAuthStore } from '@/stores/auth-store'
import { getAvailableQuickActions } from '../services/quick-action-access'

interface QuickActionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickActionDrawer({ open, onOpenChange }: QuickActionDrawerProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const actions = useMemo(() => getAvailableQuickActions(user), [user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-[360px] gap-0 border-l border-primary/10 bg-background/95 p-0 backdrop-blur sm:max-w-[360px]'>
        <SheetHeader className='border-b border-dashed border-border/70 px-5 py-5 text-left'>
          <SheetTitle className='text-base font-black uppercase tracking-widest'>{t('quickActions.drawer.title')}</SheetTitle>
          <SheetDescription className='text-[11px] font-bold text-muted-foreground'>{t('quickActions.drawer.description')}</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-3 p-4'>
          {actions.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center'>
              <ShieldAlert className='mb-3 size-9 text-muted-foreground/40' />
              <p className='text-[11px] font-black uppercase tracking-widest text-foreground'>{t('quickActions.drawer.emptyTitle')}</p>
              <p className='mt-2 text-[11px] font-bold text-muted-foreground'>{t('quickActions.drawer.emptyDescription')}</p>
            </div>
          ) : (
            actions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  type='button'
                  className='group flex items-center justify-between rounded-3xl border border-border/70 bg-background px-4 py-4 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
                  onClick={() => {
                    onOpenChange(false)
                    void navigate({ to: action.to, search: action.search })
                  }}
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                      <Icon className='size-5' />
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate text-[12px] font-black uppercase tracking-widest text-foreground'>{t(action.titleKey)}</p>
                      <p className='mt-1 text-[11px] font-medium text-muted-foreground'>{t(action.descriptionKey)}</p>
                    </div>
                  </div>
                  <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary' />
                </button>
              )
            })
          )}
        </div>

        <div className='mt-auto border-t border-dashed border-border/70 p-4'>
          <Button variant='outline' className='h-10 w-full rounded-2xl text-[11px] font-black uppercase tracking-widest' onClick={() => onOpenChange(false)}>
            {t('quickActions.drawer.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
