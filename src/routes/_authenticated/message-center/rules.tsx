import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { NotificationRuleList } from '@/features/system-mgmt/tabs/notification-rule-list'

const rulesSearchSchema = z.object({
  keyword: z.string().optional().catch(''),
  sourceCodeFilter: z.string().optional().catch('all'),
  createSourceCode: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/message-center/rules')({
  validateSearch: (search) => rulesSearchSchema.parse(search),
  component: RulesRouteComponent,
})

function RulesRouteComponent() {
  const { t } = useLanguage()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ShieldCheck}
        title={t('messageCenter.pages.rules.title')}
        description={t('messageCenter.pages.rules.description')}
        className='gap-1 p-6 md:p-6'
      />
      <NotificationRuleList
        searchState={{
          keyword: search.keyword ?? '',
          sourceCodeFilter: search.sourceCodeFilter ?? 'all',
          createSourceCode: search.createSourceCode ?? '',
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
