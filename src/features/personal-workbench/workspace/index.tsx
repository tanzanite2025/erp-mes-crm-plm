import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, NotebookPen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PersonalWorkbenchWorkspaceView } from './components/personal-workbench-workspace-view'

export default function PersonalWorkspacePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <Header fixed className='z-50 border-b-0 shadow-none' />
      <div className='h-12 border-b border-dashed bg-background md:h-[52px]'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex min-w-0 items-center gap-2'>
            <NotebookPen className='size-4 shrink-0 text-primary' />
            <div className='min-w-0'>
              <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
                个人工作收纳箱
              </p>
              <p className='truncate text-sm font-black tracking-tight italic'>
                便签与链接
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            onClick={() => void navigate({ to: '/personal-workbench' })}
          >
            <ArrowLeft className='size-4' />
            返回个人工作台
          </Button>
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='flex h-fit min-h-0 min-w-0 animate-in flex-col items-stretch gap-4 duration-700 fade-in'>
          <div className='flex flex-col gap-2 rounded-[24px] border border-dashed border-border/70 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
                统一搜索我的内容
              </p>
              <p className='text-xs font-bold text-muted-foreground'>
                仅搜索你自己的便签与链接
              </p>
            </div>
            <div className='relative w-full md:max-w-sm'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60' />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder='搜索我的便签或链接...'
                className='rounded-full pl-9'
              />
            </div>
          </div>
          <PersonalWorkbenchWorkspaceView searchQuery={searchQuery} />
        </div>
      </Main>
    </>
  )
}
