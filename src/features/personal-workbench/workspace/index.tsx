import { ArrowLeft, NotebookPen } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { PersonalWorkbenchWorkspaceView } from './components/personal-workbench-workspace-view'

export default function PersonalWorkspacePage() {
  const navigate = useNavigate()

  return (
    <>
      <Header fixed className='border-b-0 shadow-none z-50' />
      <div className='h-12 md:h-[52px] bg-background border-b border-dashed'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex items-center gap-2 min-w-0'>
            <NotebookPen className='size-4 text-primary shrink-0' />
            <div className='min-w-0'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>个人工作收纳箱</p>
              <p className='text-sm font-black tracking-tight italic truncate'>便签与链接</p>
            </div>
          </div>
          <Button type='button' variant='outline' className='rounded-full' onClick={() => void navigate({ to: '/personal-workbench' })}>
            <ArrowLeft className='size-4' />
            返回个人工作台
          </Button>
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='flex flex-col items-stretch animate-in fade-in duration-700 min-h-0 min-w-0 h-fit p-4 md:p-8 gap-4'>
          <PersonalWorkbenchWorkspaceView />
        </div>
      </Main>
    </>
  )
}
