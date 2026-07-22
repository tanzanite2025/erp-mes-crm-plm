import { ArrowDown, ArrowUp, Pencil, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SidebarCommandDefinitionDto } from '../api/shared'
import { SidebarCommandIcon } from '../data/command-icons'

type CommandLibraryCardProps = {
  command: SidebarCommandDefinitionDto
  isSaving: boolean
  onEdit: (command: SidebarCommandDefinitionDto) => void
  onToggleEnabled: (command: SidebarCommandDefinitionDto) => void
  onMove: (commandId: string, direction: 'up' | 'down') => void
}

export function CommandLibraryCard({
  command,
  isSaving,
  onEdit,
  onToggleEnabled,
  onMove,
}: CommandLibraryCardProps) {
  const { t } = useLanguage()
  const isAvailable =
    command.enabled && command.assignable && command.status !== 'disabled'

  return (
    <div
      className={cn(
        'rounded-[18px] border border-dashed border-muted/50 bg-background p-4 shadow-sm transition-colors',
        isAvailable ? 'hover:border-primary/30' : 'opacity-70'
      )}
    >
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground'>
          <SidebarCommandIcon
            iconName={command.icon}
            fallback='list'
            className='size-4.5'
          />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <h3 className='truncate text-sm font-black tracking-tight'>
                {command.title}
              </h3>
              <p className='mt-1 font-mono text-[10px] font-black tracking-tight text-muted-foreground/50'>
                {command.commandId}
              </p>
            </div>
            <div className='flex shrink-0 flex-wrap justify-end gap-1.5'>
              <Badge
                variant={command.enabled ? 'default' : 'secondary'}
                className='rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest'
              >
                {command.enabled
                  ? t('sidebarCommandAssignment.commandCard.enabled')
                  : t('sidebarCommandAssignment.commandCard.disabled')}
              </Badge>
              <Badge
                variant={command.assignable ? 'outline' : 'secondary'}
                className='rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest'
              >
                {command.assignable
                  ? t('sidebarCommandAssignment.commandCard.assignable')
                  : t('sidebarCommandAssignment.commandCard.notAssignable')}
              </Badge>
            </div>
          </div>

          <p className='mt-2 line-clamp-2 text-[11px] leading-4 font-medium text-muted-foreground/75'>
            {command.description ||
              t('sidebarCommandAssignment.commandCard.noDescription')}
          </p>

          <div className='mt-3 grid gap-2 text-[10px] font-black text-muted-foreground/60 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
            <p className='truncate rounded-xl bg-muted/25 px-3 py-2 font-mono'>
              {t('sidebarCommandAssignment.commandCard.route')} {command.route}
            </p>
            <p className='truncate rounded-xl bg-muted/25 px-3 py-2 font-mono'>
              {t('sidebarCommandAssignment.commandCard.params')}{' '}
              {JSON.stringify(command.searchParams ?? {})}
            </p>
          </div>

          <div className='mt-3 flex flex-wrap items-center justify-between gap-2'>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 rounded-full border-dashed px-2 text-[10px] font-black tracking-widest'
                disabled={isSaving}
                onClick={() => onMove(command.commandId, 'up')}
              >
                <ArrowUp className='size-3.5' />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 rounded-full border-dashed px-2 text-[10px] font-black tracking-widest'
                disabled={isSaving}
                onClick={() => onMove(command.commandId, 'down')}
              >
                <ArrowDown className='size-3.5' />
              </Button>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest'
                disabled={isSaving}
                onClick={() => onEdit(command)}
              >
                <Pencil className='size-3.5' />
                {t('sidebarCommandAssignment.commandCard.edit')}
              </Button>
              <Button
                type='button'
                variant={command.enabled ? 'outline' : 'default'}
                size='sm'
                className='h-7 rounded-full px-3 text-[10px] font-black tracking-widest'
                disabled={isSaving}
                onClick={() => onToggleEnabled(command)}
              >
                <Power className='size-3.5' />
                {command.enabled
                  ? t('sidebarCommandAssignment.commandCard.disabled')
                  : t('sidebarCommandAssignment.commandCard.enabled')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
