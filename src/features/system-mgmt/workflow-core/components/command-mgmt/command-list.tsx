import { Bell, Edit3, Link as LinkIcon, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getStandardCommandDisplayTitle,
  getStandardCommandScopeSummary,
  type StandardCommand,
} from '../../data/schema'
import { useBusinessEventSources } from '../../hooks/use-business-event-sources'

interface CommandListProps {
  commands: StandardCommand[]
  onEdit: (cmd: StandardCommand) => void
  onDelete: (id: string) => void
}

export function CommandList({ commands, onEdit, onDelete }: CommandListProps) {
  const { t } = useLanguage()
  const { sources } = useBusinessEventSources()

  if (commands.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed py-20 opacity-20'>
        <Bell className='mb-4 size-12' />
        <p className='text-xs font-black tracking-widest uppercase'>
          {t('workflowCore.commands.list.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {commands.map((cmd) => (
        <Card
          key={cmd.id}
          className='group overflow-hidden rounded-[24px] border-2 transition-all hover:border-primary/40'
        >
          <CardContent className='space-y-4 p-5'>
            <div className='flex items-start justify-between gap-4'>
              <div />
              <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={() => onEdit(cmd)}
                >
                  <Edit3 className='size-3.5 text-blue-500' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  onClick={() => onDelete(cmd.id)}
                >
                  <Trash2 className='size-3.5 text-destructive' />
                </Button>
              </div>
            </div>

            <div className='space-y-1'>
              <h4 className='flex items-center gap-2 text-sm font-black tracking-tight text-primary uppercase'>
                <Bell className='size-3' />{' '}
                {getStandardCommandDisplayTitle(cmd, sources)}
              </h4>
              <div className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                {getStandardCommandScopeSummary(cmd)}
              </div>
              <div className='rounded-xl border border-dashed bg-muted/30 p-3'>
                <p className='text-[11px] leading-relaxed font-bold text-foreground/70 italic'>
                  "{cmd.content}"
                </p>
              </div>
            </div>

            {cmd.targetLink && (
              <div className='flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-2 py-1.5'>
                <LinkIcon className='size-3 text-primary' />
                <span className='truncate text-[10px] font-bold text-primary'>
                  {cmd.targetLink}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
