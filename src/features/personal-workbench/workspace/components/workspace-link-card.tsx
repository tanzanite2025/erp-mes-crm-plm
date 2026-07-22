import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PersonalWorkspaceLinkItem } from '../data/schema'

interface WorkspaceLinkCardProps {
  isCompactLayout?: boolean
  item: PersonalWorkspaceLinkItem
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export function WorkspaceLinkCard({
  isCompactLayout = false,
  item,
  onDelete,
  onEdit,
}: WorkspaceLinkCardProps) {
  return (
    <Card
      className={
        isCompactLayout
          ? 'rounded-[22px] border border-primary/20 bg-background py-0 shadow-sm'
          : 'rounded-[28px] border border-primary/20 bg-background py-0 shadow-sm'
      }
    >
      <CardHeader className={isCompactLayout ? 'px-4 py-4' : 'px-5 py-5'}>
        <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/70 uppercase'>
          <Link2 className={isCompactLayout ? 'size-3.5' : 'size-4'} />
          链接
        </div>
        <CardTitle
          className={
            isCompactLayout
              ? 'text-sm font-black tracking-tight text-foreground'
              : 'text-base font-black tracking-tight text-foreground'
          }
        >
          {item.title || '未命名链接'}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={
          isCompactLayout
            ? 'space-y-2 px-4 pb-0'
            : 'space-y-3 px-5 pb-0'
        }
      >
        <a
          href={item.url}
          target='_blank'
          rel='noreferrer'
          className='flex items-center gap-2 break-all text-sm font-medium text-primary underline-offset-4 hover:underline'
        >
          <ExternalLink className={isCompactLayout ? 'size-3.5 shrink-0' : 'size-4 shrink-0'} />
          {item.url}
        </a>
        <p className={isCompactLayout ? 'text-xs leading-5 text-muted-foreground' : 'text-sm leading-6 text-muted-foreground'}>
          {item.remark || '这条链接还没有备注。'}
        </p>
      </CardContent>
      <CardFooter
        className={
          isCompactLayout
            ? 'mt-auto flex items-center justify-between px-4 py-3'
            : 'mt-auto flex items-center justify-between px-5 py-4'
        }
      >
        <span className='text-[10px] font-bold text-muted-foreground'>
          更新于 {new Date(item.updatedAt).toLocaleString()}
        </span>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest'
            onClick={() => onEdit(item.id)}
          >
            <Pencil className='size-3.5' />
            编辑
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8 rounded-full text-rose-500'
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className='size-4' />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
