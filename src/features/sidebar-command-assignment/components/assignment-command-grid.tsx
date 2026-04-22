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
    <section className='rounded-[32px] border border-dashed border-muted/50 bg-background p-5 shadow-inner'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.commandGrid.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.commandGrid.description')}
          </p>
        </div>
        <ListPlus className='size-5 text-muted-foreground' />
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {commands.map((command) => {
          const checked = selectedCodeSet.has(command.code)

          return (
            <div
              key={command.code}
              className={cn(
                'flex min-h-20 items-center gap-3 rounded-[20px] border p-4 transition-colors',
                checked
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-dashed border-muted/50 bg-background'
              )}
            >
              <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground'>
                <SidebarCommandIcon
                  iconName={command.iconName}
                  className='size-4.5'
                />
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='min-w-0'>
                    <h3 className='truncate text-sm font-black tracking-tight'>
                      {command.title}
                    </h3>
                    <p className='mt-1 truncate font-mono text-[10px] font-black tracking-tight text-muted-foreground/50'>
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
