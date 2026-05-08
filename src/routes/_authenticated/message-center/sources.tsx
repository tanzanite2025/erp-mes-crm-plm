import { createFileRoute } from '@tanstack/react-router'
import { Settings2 } from 'lucide-react'
import { z } from 'zod'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { BusinessEventSourceList } from '@/features/system-mgmt/tabs/business-event-source-list'

type BusinessEventSourceListRouteSearchState = {
  templateCode: string
  searchValue: string
  expandedSourceIds: string[]
}

const sourcesSearchSchema = z.object({
  templateCode: z.string().optional().catch(''),
  searchValue: z.string().optional().catch(''),
  expandedSourceIds: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/message-center/sources')({
  validateSearch: (search) => sourcesSearchSchema.parse(search),
  component: SourcesRouteComponent,
})

function SourcesRouteComponent() {
  const { t } = useLanguage()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Settings2}
        title={t('messageCenter.pages.sources.title')}
        description={t('messageCenter.pages.sources.description')}
        className='gap-1 p-6 md:p-6'
      />
      <BusinessEventSourceList
        searchState={{
          templateCode: search.templateCode ?? '',
          searchValue: search.searchValue ?? '',
          expandedSourceIds: search.expandedSourceIds
            ? search.expandedSourceIds.split(',').filter(Boolean)
            : [],
        }}
        onSearchStateChange={(partial: Partial<BusinessEventSourceListRouteSearchState>) => {
          void navigate({
            search: (prev) => ({
              ...prev,
              ...partial,
              expandedSourceIds: partial.expandedSourceIds
                ? partial.expandedSourceIds.join(',')
                : partial.expandedSourceIds === undefined
                  ? prev.expandedSourceIds
                  : '',
            }),
            replace: true,
          })
        }}
      />
    </div>
  )
}
