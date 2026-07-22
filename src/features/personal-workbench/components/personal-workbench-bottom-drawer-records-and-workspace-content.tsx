import { useState } from 'react'
import { Search } from 'lucide-react'
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
    <div className='flex h-full min-h-0 min-w-0 flex-col items-stretch gap-2 px-3 py-2 md:px-4 md:py-3'>
      <Tabs
        value={activePersonalWorkbenchBottomDrawerTabId}
        onValueChange={(value) =>
          setActivePersonalWorkbenchBottomDrawerTabId(
            value as PersonalWorkbenchBottomDrawerTabId
          )
        }
        className='flex min-h-0 flex-1 flex-col gap-2'
      >
        <div className='flex shrink-0 flex-col gap-2 rounded-[18px] border border-border/70 bg-muted/10 px-3 py-2 md:flex-row md:items-center md:justify-between'>
          <TabsList className='h-8 w-full rounded-full p-1 md:w-auto'>
            <TabsTrigger
              value='records'
              className='rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
            >
              个人记录
            </TabsTrigger>
            <TabsTrigger
              value='workspace'
              className='rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
            >
              工作收纳
            </TabsTrigger>
          </TabsList>

          <div className='relative w-full md:max-w-md'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/60' />
            <Input
              value={personalWorkbenchBottomDrawerSearchQuery}
              onChange={(event) =>
                setPersonalWorkbenchBottomDrawerSearchQuery(event.target.value)
              }
              placeholder='搜索记录、便签、链接…'
              className='h-8 rounded-full pl-8 text-xs'
            />
          </div>
        </div>
        <TabsContent
          value='records'
          className='m-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden'
        >
          <PersonalWorkbenchRecordsView
            isCompactLayout
            searchQuery={personalWorkbenchBottomDrawerSearchQuery}
          />
        </TabsContent>
        <TabsContent
          value='workspace'
          className='m-0 min-h-0 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden'
        >
          <PersonalWorkbenchWorkspaceView
            isCompactLayout
            searchQuery={personalWorkbenchBottomDrawerSearchQuery}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
