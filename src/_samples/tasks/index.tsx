import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TasksProvider } from './store/tasks-context'
import { TasksDialogs } from './views/tasks-dialogs'
import { TasksPrimaryButtons } from './views/tasks-primary-buttons'
import { TasksTable } from './views/tasks-table'

export function Tasks() {
  return (
    <TasksProvider>
      <Header fixed />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>生产计划</h2>
            <p className='text-muted-foreground'>
              这是本月的生产任务与计划列表。
            </p>
          </div>
          <TasksPrimaryButtons />
        </div>
        <TasksTable />
      </Main>

      <TasksDialogs />
    </TasksProvider>
  )
}
