import { ListPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Switch } from '@/components/ui/switch'
import { SidebarCommandIcon } from '../data/command-icons'
import type { PresentedSidebarCommand } from '../types'

type AssignmentCommandGridProps = {
  commands: PresentedSidebarCommand[]
  selectedCodeSet: Set<string>
  hasSelectedAccount: boolean
  onToggleCommand: (code: string, checked: boolean) => void
}

export function AssignmentCommandGrid({
  commands,
  selectedCodeSet,
  hasSelectedAccount,
  onToggleCommand,
}: AssignmentCommandGridProps) {
  const { t } = useLanguage()

  return (
    <section className='rounded-[18px] border border-dashed border-muted/50 bg-background px-4 py-3 shadow-inner'>
      <div className='mb-2 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.commandGrid.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.commandGrid.description')}
          </p>
        </div>
        <ListPlus className='size-4 text-muted-foreground' />
      </div>

      <div className='grid gap-2 lg:grid-cols-2'>
        {commands.map((command) => {
          const checked = selectedCodeSet.has(command.code)

          return (
            <div
              key={command.code}
              className={cn(
                'flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors',
                checked
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-dashed border-muted/50 bg-background'
              )}
            >
              <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground'>
                <SidebarCommandIcon
                  iconName={command.iconName}
                  className='size-4'
                />
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <h3 className='truncate text-[13px] font-black tracking-tight'>
                      {command.title}
                    </h3>
                    <p className='mt-0.5 truncate font-mono text-[9px] font-black tracking-tight text-muted-foreground/50'>
                      {command.route}
                    </p>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={!hasSelectedAccount}
                    onCheckedChange={(value) =>
                      onToggleCommand(command.code, value)
                    }
                    aria-label={`${t('sidebarCommandAssignment.tabs.assignment')} ${command.title}`}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
