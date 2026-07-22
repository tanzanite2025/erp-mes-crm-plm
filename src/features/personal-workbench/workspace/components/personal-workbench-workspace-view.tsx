import { useMemo, useState } from 'react'
import { Plus, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type {
  PersonalWorkspaceItemDraft,
  PersonalWorkspaceItemType,
} from '../data/schema'
import { useWorkspaceItems } from '../hooks/use-workspace-items'
import { WorkspaceBoard } from './workspace-board'
import { WorkspaceItemEditor } from './workspace-item-editor'

interface PersonalWorkbenchWorkspaceViewProps {
  isCompactLayout?: boolean
  searchQuery: string
}

export function PersonalWorkbenchWorkspaceView({
  isCompactLayout = false,
  searchQuery,
}: PersonalWorkbenchWorkspaceViewProps) {
  const { createItem, isReady, items, removeItem, updateItem } =
    useWorkspaceItems()
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editorType, setEditorType] =
    useState<PersonalWorkspaceItemType>('note')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items
    }
    return items.filter((item) => {
      const haystack =
        item.type === 'note'
          ? [item.title, item.content, item.type].join(' ')
          : [item.title, item.url, item.remark, item.type].join(' ')
      return haystack.toLowerCase().includes(normalizedQuery)
    })
  }, [items, normalizedQuery])

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? undefined,
    [editingItemId, items]
  )

  const handleEditorOpenChange = (open: boolean) => {
    setIsEditorOpen(open)
    if (!open) {
      setEditingItemId(null)
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col items-stretch gap-2'>
      <div className='flex items-center justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest md:h-9 md:px-4 md:text-[11px]'
          onClick={() => {
            setEditingItemId(null)
            setEditorType('note')
            setIsEditorOpen(true)
          }}
        >
          <StickyNote className='size-3.5' />
          新建便签
        </Button>
        <Button
          type='button'
          className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest md:h-9 md:px-4 md:text-[11px]'
          onClick={() => {
            setEditingItemId(null)
            setEditorType('link')
            setIsEditorOpen(true)
          }}
        >
          <Plus className='size-3.5' />
          新增链接
        </Button>
      </div>
      {!isReady ? (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-sm font-bold text-muted-foreground'>
          正在加载个人工作收纳箱…
        </div>
      ) : filteredItems.length === 0 && items.length > 0 ? (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-center'>
          <div className='max-w-md'>
            <p className='text-base font-black tracking-tight text-foreground'>
              未找到匹配的便签或链接
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              当前搜索只会在你自己的工作收纳内容中查找标题、正文、备注和链接地址。
            </p>
          </div>
        </div>
      ) : (
        <WorkspaceBoard
          isCompactLayout={isCompactLayout}
          items={filteredItems}
          onDelete={(id) => {
            void (async () => {
              try {
                await removeItem(id)
                toast.success('条目已删除')
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : '删除条目失败'
                )
              }
            })()
          }}
          onEdit={(id) => {
            const target = items.find((item) => item.id === id)
            if (!target) {
              return
            }
            setEditingItemId(id)
            setEditorType(target.type)
            setIsEditorOpen(true)
          }}
        />
      )}
      <WorkspaceItemEditor
        item={editingItem}
        open={isEditorOpen}
        type={editorType}
        onOpenChange={handleEditorOpenChange}
        onSubmit={async (
          draft: PersonalWorkspaceItemDraft,
          itemId?: string
        ) => {
          if (itemId) {
            const target = items.find((item) => item.id === itemId)
            if (!target) {
              throw new Error('当前条目不存在，无法更新')
            }
            if (target.type === 'note') {
              const updatedItem = await updateItem({
                ...target,
                content: draft.content ?? '',
                title: draft.title,
              })
              if (!updatedItem) {
                throw new Error('便签更新失败')
              }
            } else {
              const updatedItem = await updateItem({
                ...target,
                remark: draft.remark ?? '',
                title: draft.title,
                url: draft.url ?? '',
              })
              if (!updatedItem) {
                throw new Error('链接更新失败')
              }
            }
            toast.success('条目已更新')
            return
          }

          const createdItem = await createItem(draft)
          if (!createdItem) {
            throw new Error(
              draft.type === 'note' ? '便签保存失败' : '链接保存失败'
            )
          }
          toast.success(draft.type === 'note' ? '便签已保存' : '链接已保存')
        }}
      />
    </div>
  )
}
