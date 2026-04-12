'use client'

import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAuthStore } from '@/stores/auth-store'
import { getAvailableQuickActions } from '../services/quick-action-access'

interface QuickActionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickActionDrawer({ open, onOpenChange }: QuickActionDrawerProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const actions = useMemo(() => getAvailableQuickActions(user), [user])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-[360px] gap-0 border-l border-primary/10 bg-background/95 p-0 backdrop-blur sm:max-w-[360px]'>
        <SheetHeader className='border-b border-dashed border-border/70 px-5 py-5 text-left'>
          <SheetTitle className='text-base font-black uppercase tracking-widest'>快捷扫描</SheetTitle>
          <SheetDescription className='text-[11px] font-bold text-muted-foreground'>按当前账号权限显示可直接进入的扫描动作。</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-3 p-4'>
          {actions.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center'>
              <ShieldAlert className='mb-3 size-9 text-muted-foreground/40' />
              <p className='text-[11px] font-black uppercase tracking-widest text-foreground'>暂无可用快捷动作</p>
              <p className='mt-2 text-[11px] font-bold text-muted-foreground'>当前账号没有被授权的快捷扫描入口。</p>
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
                      <p className='truncate text-[12px] font-black uppercase tracking-widest text-foreground'>{action.title}</p>
                      <p className='mt-1 text-[11px] font-medium text-muted-foreground'>{action.description}</p>
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
            收起快捷入口
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
