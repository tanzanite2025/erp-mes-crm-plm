import { ListChecks } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import type { AssignmentPreviewCommand } from '../data/assignment-preview'
import { SidebarCommandIcon } from '../data/command-icons'

type AssignmentEffectivePreviewProps = {
  commands: AssignmentPreviewCommand[]
}

export function AssignmentEffectivePreview({
  commands,
}: AssignmentEffectivePreviewProps) {
  const { t } = useLanguage()

  return (
    <section className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 shadow-inner'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.preview.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.preview.description')}
          </p>
        </div>
        <ListChecks className='size-5 text-muted-foreground' />
      </div>

      <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-3'>
        {commands.map((command) => (
          <div
            key={command.code}
            className='flex min-h-14 items-center gap-3 rounded-[18px] bg-background/80 px-3 py-2 shadow-sm'
          >
            <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground'>
              <SidebarCommandIcon
                iconName={command.iconName}
                fallback='list'
                className='size-4'
              />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-sm font-black tracking-tight'>
                {command.title}
              </span>
              <span className='mt-0.5 block truncate font-mono text-[10px] font-black text-muted-foreground/50'>
                {command.code}
              </span>
            </span>
            <Badge
              variant={
                command.assignmentSource === 'category' ? 'default' : 'outline'
              }
              className='shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest'
            >
              {command.assignmentSource === 'category'
                ? command.sourceCategoryName ||
                  t('sidebarCommandAssignment.preview.categorySource')
                : t('sidebarCommandAssignment.preview.directSource')}
            </Badge>
          </div>
        ))}

        {commands.length === 0 ? (
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/60 px-4 py-10 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase md:col-span-2 xl:col-span-3'>
            {t('sidebarCommandAssignment.preview.empty')}
          </div>
        ) : null}
      </div>
    </section>
  )
}
