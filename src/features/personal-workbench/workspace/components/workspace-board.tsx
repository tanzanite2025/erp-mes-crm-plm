import type { PersonalWorkspaceItem } from '../data/schema'
import { WorkspaceLinkCard } from './workspace-link-card'
import { WorkspaceNoteCard } from './workspace-note-card'

interface WorkspaceBoardProps {
  isCompactLayout?: boolean
  items: PersonalWorkspaceItem[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export function WorkspaceBoard({
  isCompactLayout = false,
  items,
  onDelete,
  onEdit,
}: WorkspaceBoardProps) {
  if (items.length === 0) {
    return (
      <div
        className={
          isCompactLayout
            ? 'flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/10 p-4 text-center'
            : 'flex min-h-[320px] items-center justify-center rounded-[32px] border border-dashed border-border/70 bg-muted/10 p-6 text-center'
        }
      >
        <div className='max-w-md'>
          <p
            className={
              isCompactLayout
                ? 'text-xs leading-tight font-black tracking-tighter text-foreground uppercase italic md:text-base'
                : 'text-sm leading-tight font-black tracking-tighter text-foreground uppercase italic md:text-lg'
            }
          >
            这里先收纳你的便签和链接
          </p>
          <p
            className={
              isCompactLayout
                ? 'mt-2 text-[8px] leading-tight font-black tracking-widest text-muted-foreground uppercase opacity-60 md:text-[9px] md:leading-snug'
                : 'mt-3 text-[8px] leading-tight font-black tracking-widest text-muted-foreground uppercase opacity-60 md:text-[9px] md:leading-snug'
            }
          >
            适合保存随手复制的文本、后台入口、网址和个人备注，不需要先挂到正式业务模块。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        isCompactLayout
          ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'
          : 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
      }
    >
      {items.map((item) =>
        item.type === 'note' ? (
          <WorkspaceNoteCard
            key={item.id}
            isCompactLayout={isCompactLayout}
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : (
          <WorkspaceLinkCard
            key={item.id}
            isCompactLayout={isCompactLayout}
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )
      )}
    </div>
  )
}
