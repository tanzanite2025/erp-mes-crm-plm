import { useState } from 'react'
import { FolderKanban, NotebookPen, Search } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PersonalWorkbenchRecordsView } from './components/personal-workbench-records-view'
import { PersonalWorkbenchWorkspaceView } from './workspace/components/personal-workbench-workspace-view'

export default function PersonalWorkbenchPage() {
  const [activeTab, setActiveTab] = useState<'records' | 'workspace'>('records')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <Header fixed className='border-b-0 shadow-none z-50' />
      <div className='h-12 md:h-[52px] bg-background border-b border-dashed'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex items-center gap-2 min-w-0'>
            <NotebookPen className='size-4 text-primary shrink-0' />
            <div className='min-w-0'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>个人工作台</p>
              <p className='text-sm font-black tracking-tight italic truncate'>个人记录与工作收纳</p>
            </div>
          </div>
          <FolderKanban className='size-4 text-muted-foreground/60 shrink-0' />
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='flex flex-col items-stretch animate-in fade-in duration-700 min-h-0 min-w-0 h-fit p-4 md:p-8 gap-4'>
          <div className='flex flex-col gap-2 rounded-[24px] border border-dashed border-border/70 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between'>
            <div className='min-w-0'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>统一搜索我的内容</p>
              <p className='text-xs font-bold text-muted-foreground'>仅搜索你自己的个人记录、便签与链接</p>
            </div>
            <div className='relative w-full md:max-w-sm'>
              <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60' />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder='搜索我的内容...'
                className='rounded-full pl-9'
              />
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'records' | 'workspace')} className='gap-4'>
            <TabsList className='h-auto rounded-2xl p-1'>
              <TabsTrigger value='records' className='rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest'>个人记录缓冲区</TabsTrigger>
              <TabsTrigger value='workspace' className='rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest'>工作收纳箱</TabsTrigger>
            </TabsList>
            <TabsContent value='records'>
              <PersonalWorkbenchRecordsView searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value='workspace'>
              <PersonalWorkbenchWorkspaceView searchQuery={searchQuery} />
            </TabsContent>
          </Tabs>
        </div>
      </Main>
    </>
  )
}
