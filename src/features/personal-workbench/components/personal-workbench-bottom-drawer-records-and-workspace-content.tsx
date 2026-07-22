import { useState } from 'react'
import { FolderKanban, NotebookPen, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PersonalWorkbenchWorkspaceView } from '../workspace/components/personal-workbench-workspace-view'
import { PersonalWorkbenchRecordsView } from './personal-workbench-records-view'

type PersonalWorkbenchBottomDrawerTabId = 'records' | 'workspace'

export function PersonalWorkbenchBottomDrawerRecordsAndWorkspaceContent() {
  const [
    activePersonalWorkbenchBottomDrawerTabId,
    setActivePersonalWorkbenchBottomDrawerTabId,
  ] = useState<PersonalWorkbenchBottomDrawerTabId>('records')
  const [
    personalWorkbenchBottomDrawerSearchQuery,
    setPersonalWorkbenchBottomDrawerSearchQuery,
  ] = useState('')

  return (
    <div className='flex h-full min-h-0 min-w-0 flex-col items-stretch gap-4 px-4 pt-4 pb-4 md:px-5'>
      <div className='flex shrink-0 flex-col gap-2 rounded-[22px] border border-dashed border-border/70 bg-muted/10 p-3 md:flex-row md:items-center md:justify-between md:p-4'>
        <div className='flex min-w-0 items-center gap-2'>
          <NotebookPen className='size-4 shrink-0 text-primary' />
          <div className='min-w-0'>
            <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
              统一搜索我的内容
            </p>
            <p className='truncate text-xs font-bold text-muted-foreground'>
              仅搜索你自己的个人记录、便签与链接
            </p>
          </div>
        </div>
        <div className='relative w-full md:max-w-sm'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60' />
          <Input
            value={personalWorkbenchBottomDrawerSearchQuery}
            onChange={(event) =>
              setPersonalWorkbenchBottomDrawerSearchQuery(event.target.value)
            }
            placeholder='搜索我的内容...'
            className='rounded-full pl-9'
          />
        </div>
      </div>

      <Tabs
        value={activePersonalWorkbenchBottomDrawerTabId}
        onValueChange={(value) =>
          setActivePersonalWorkbenchBottomDrawerTabId(
            value as PersonalWorkbenchBottomDrawerTabId
          )
        }
        className='min-h-0 flex-1 gap-4'
      >
        <div className='flex shrink-0 items-center justify-between gap-3'>
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
          <FolderKanban className='size-4 shrink-0 text-muted-foreground/60' />
        </div>
        <TabsContent
          value='records'
          className='min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden'
        >
          <PersonalWorkbenchRecordsView
            searchQuery={personalWorkbenchBottomDrawerSearchQuery}
          />
        </TabsContent>
        <TabsContent
          value='workspace'
          className='min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden'
        >
          <PersonalWorkbenchWorkspaceView
            searchQuery={personalWorkbenchBottomDrawerSearchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
