import type { PersonalWorkspaceItem } from '../data/schema'
import { WorkspaceLinkCard } from './workspace-link-card'
import { WorkspaceNoteCard } from './workspace-note-card'

interface WorkspaceBoardProps {
  items: PersonalWorkspaceItem[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export function WorkspaceBoard({
  items,
  onDelete,
  onEdit,
}: WorkspaceBoardProps) {
  if (items.length === 0) {
    return (
      <div className='flex min-h-[320px] items-center justify-center rounded-[32px] border border-dashed border-border/70 bg-muted/10 p-6 text-center'>
        <div className='max-w-md'>
          <p className='text-sm leading-tight font-black tracking-tighter text-foreground uppercase italic md:text-lg'>
            这里先收纳你的便签和链接
          </p>
          <p className='mt-3 text-[8px] leading-tight font-black tracking-widest text-muted-foreground uppercase opacity-60 md:text-[9px] md:leading-snug'>
            适合保存随手复制的文本、后台入口、网址和个人备注，不需要先挂到正式业务模块。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
      {items.map((item) =>
        item.type === 'note' ? (
          <WorkspaceNoteCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : (
          <WorkspaceLinkCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )
      )}
    </div>
  )
}
