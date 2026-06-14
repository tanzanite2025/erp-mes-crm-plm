import { FileText, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PersonalWorkspaceNoteItem } from '../data/schema'

interface WorkspaceNoteCardProps {
  item: PersonalWorkspaceNoteItem
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export function WorkspaceNoteCard({
  item,
  onDelete,
  onEdit,
}: WorkspaceNoteCardProps) {
  return (
    <Card className='min-h-64 rounded-[28px] border border-amber-200/70 bg-amber-50/70 py-0 shadow-sm'>
      <CardHeader className='px-5 py-5'>
        <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-700/70 uppercase'>
          <FileText className='size-4' />
          便签
        </div>
        <CardTitle className='text-base font-black tracking-tight text-foreground'>
          {item.title || '未命名便签'}
        </CardTitle>
      </CardHeader>
      <CardContent className='px-5 pb-0'>
        <p className='text-sm leading-6 whitespace-pre-wrap text-foreground/80'>
          {item.content || '这张便签还没有内容。'}
        </p>
      </CardContent>
      <CardFooter className='mt-auto flex items-center justify-between px-5 py-4'>
        <span className='text-[10px] font-bold text-muted-foreground'>
          更新于 {new Date(item.updatedAt).toLocaleString()}
        </span>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            onClick={() => onEdit(item.id)}
          >
            <Pencil className='size-4' />
            编辑
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='rounded-full text-rose-500'
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
