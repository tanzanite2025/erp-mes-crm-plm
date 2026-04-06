import { Bell, Edit3, Link as LinkIcon, Tag as TagIcon, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { type StandardCommand } from '../../data/schema'

interface CommandListProps {
  commands: StandardCommand[]
  onEdit: (cmd: StandardCommand) => void
  onDelete: (id: string) => void
}

export function CommandList({ commands, onEdit, onDelete }: CommandListProps) {
  const { t } = useLanguage()

  if (commands.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed py-20 opacity-20'>
        <Bell className='mb-4 size-12' />
        <p className='text-xs font-black uppercase tracking-widest'>
          {t('workflowCore.commands.list.empty')}
        </p>
      </div>
    )
  }

  const getNodeTypeLabel = (nodeType: StandardCommand['nodeType']) => {
    if (nodeType === 'START') return t('workflowCore.commands.nodeTypes.start')
    if (nodeType === 'APPROVAL') return t('workflowCore.commands.nodeTypes.approval')
    if (nodeType === 'CHECK') return t('workflowCore.commands.nodeTypes.check')
    return t('workflowCore.commands.nodeTypes.production')
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
              <div className='flex gap-1.5'>
                <Badge
                  variant='outline'
                  className='shrink-0 rounded-lg border-slate-200 text-[9px] font-black uppercase tracking-tighter text-slate-500'
                >
                  {t('workflowCore.commands.list.scope')}: {cmd.bindType}
                </Badge>
                {cmd.nodeType && (
                  <Badge
                    className={`shrink-0 rounded-lg border-none text-[9px] font-black uppercase tracking-tighter text-white ${
                      cmd.nodeType === 'START'
                        ? 'bg-purple-500'
                        : cmd.nodeType === 'APPROVAL'
                          ? 'bg-orange-500'
                          : cmd.nodeType === 'CHECK'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                    }`}
                  >
                    {t('workflowCore.commands.list.nodeType')}: {getNodeTypeLabel(cmd.nodeType)}
                  </Badge>
                )}
              </div>
              <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                <Button variant='ghost' size='icon' className='size-7' onClick={() => onEdit(cmd)}>
                  <Edit3 className='size-3.5 text-blue-500' />
                </Button>
                <Button variant='ghost' size='icon' className='size-7' onClick={() => onDelete(cmd.id)}>
                  <Trash2 className='size-3.5 text-destructive' />
                </Button>
              </div>
            </div>

            <div className='space-y-1'>
              <h4 className='flex items-center gap-2 text-sm font-black uppercase tracking-tight text-primary'>
                <Bell className='size-3' /> {cmd.title}
              </h4>
              <div className='rounded-xl border border-dashed bg-muted/30 p-3'>
                <p className='text-[11px] font-bold italic leading-relaxed text-foreground/70'>
                  "{cmd.content}"
                </p>
              </div>
            </div>

            {cmd.targetLink && (
              <div className='flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-2 py-1.5'>
                <LinkIcon className='size-3 text-primary' />
                <span className='truncate text-[10px] font-bold text-primary'>{cmd.targetLink}</span>
              </div>
            )}

            {cmd.params && cmd.params.length > 0 && (
              <div className='flex flex-wrap gap-1.5 border-t border-dashed pt-2'>
                {cmd.params.map((param, index) => (
                  <div
                    key={index}
                    className='flex items-center gap-1 rounded bg-amber-50 px-1 text-[9px] font-black uppercase text-amber-600/60'
                  >
                    <TagIcon className='size-2.5' />
                    [{param}]
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
