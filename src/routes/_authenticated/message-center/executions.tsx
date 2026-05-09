import { createFileRoute } from '@tanstack/react-router'
import { Logs } from 'lucide-react'
import { z } from 'zod'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { RuleExecutionLogTab } from '@/features/system-mgmt/tabs/rule-execution-log-tab'

const executionsSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(1),
  keyword: z.string().optional().catch(''),
  sourceCode: z.string().optional().catch('all'),
  executionType: z
    .enum(['all', 'match', 'notify', 'approval', 'workflow'])
    .optional()
    .catch('all'),
  executionStatus: z
    .enum(['all', 'matched', 'success', 'failed', 'skipped'])
    .optional()
    .catch('all'),
})

export const Route = createFileRoute('/_authenticated/message-center/executions')({
  validateSearch: (search) => executionsSearchSchema.parse(search),
  component: ExecutionsRouteComponent,
})

function ExecutionsRouteComponent() {
  const { t } = useLanguage()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Logs}
        title={t('messageCenter.pages.executions.title')}
        description={t('messageCenter.pages.executions.description')}
        className='gap-1'
      />
      <RuleExecutionLogTab
        searchState={{
          page: search.page ?? 1,
          keyword: search.keyword ?? '',
          sourceCode: search.sourceCode ?? 'all',
          executionType: search.executionType ?? 'all',
          executionStatus: search.executionStatus ?? 'all',
        }}
        onSearchStateChange={(partial) => {
          void navigate({
            search: (prev) => ({
              ...prev,
              ...partial,
            }),
            replace: true,
          })
        }}
      />
    </div>
  )
}
