import { useState } from 'react'
import { FolderKanban, NotebookPen, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PersonalWorkbenchRecordsView } from './components/personal-workbench-records-view'
import { PersonalWorkbenchWorkspaceView } from './workspace/components/personal-workbench-workspace-view'

export default function PersonalWorkbenchPage() {
  const [activeTab, setActiveTab] = useState<'records' | 'workspace'>('records')
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
                个人工作台
              </p>
              <p className='truncate text-sm font-black tracking-tight italic'>
                个人记录与工作收纳
              </p>
            </div>
          </div>
          <FolderKanban className='size-4 shrink-0 text-muted-foreground/60' />
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
                仅搜索你自己的个人记录、便签与链接
              </p>
            </div>
            <div className='relative w-full md:max-w-sm'>
              <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60' />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder='搜索我的内容...'
                className='rounded-full pl-9'
              />
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'records' | 'workspace')
            }
            className='gap-4'
          >
            <TabsList className='h-auto rounded-2xl p-1'>
              <TabsTrigger
                value='records'
                className='rounded-xl px-4 py-2 text-[11px] font-black tracking-widest uppercase'
              >
                个人记录缓冲区
              </TabsTrigger>
              <TabsTrigger
                value='workspace'
                className='rounded-xl px-4 py-2 text-[11px] font-black tracking-widest uppercase'
              >
                工作收纳箱
              </TabsTrigger>
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
