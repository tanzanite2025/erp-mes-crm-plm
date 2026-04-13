import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { PersonalWorkspaceLinkItem } from '../data/schema'

interface WorkspaceLinkCardProps {
  item: PersonalWorkspaceLinkItem
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export function WorkspaceLinkCard({ item, onDelete, onEdit }: WorkspaceLinkCardProps) {
  return (
    <Card className='rounded-[28px] border border-primary/20 bg-background py-0 shadow-sm'>
      <CardHeader className='px-5 py-5'>
        <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/70'>
          <Link2 className='size-4' />
          链接
        </div>
        <CardTitle className='text-base font-black tracking-tight text-foreground'>{item.title || '未命名链接'}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 px-5 pb-0'>
        <a href={item.url} target='_blank' rel='noreferrer' className='flex items-center gap-2 break-all text-sm font-medium text-primary underline-offset-4 hover:underline'>
          <ExternalLink className='size-4 shrink-0' />
          {item.url}
        </a>
        <p className='text-sm leading-6 text-muted-foreground'>{item.remark || '这条链接还没有备注。'}</p>
      </CardContent>
      <CardFooter className='mt-auto flex items-center justify-between px-5 py-4'>
        <span className='text-[10px] font-bold text-muted-foreground'>更新于 {new Date(item.updatedAt).toLocaleString()}</span>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='sm' className='rounded-full' onClick={() => onEdit(item.id)}>
            <Pencil className='size-4' />
            编辑
          </Button>
          <Button type='button' variant='ghost' size='icon' className='rounded-full text-rose-500' onClick={() => onDelete(item.id)}>
            <Trash2 className='size-4' />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
