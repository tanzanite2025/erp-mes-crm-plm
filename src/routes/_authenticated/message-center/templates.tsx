import { createFileRoute } from '@tanstack/react-router'
import { Library } from 'lucide-react'
import { z } from 'zod'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { CommandMgmt } from '@/features/system-mgmt/workflow-core/components/command-mgmt'

const templatesSearchSchema = z.object({
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/message-center/templates')({
  validateSearch: (search) => templatesSearchSchema.parse(search),
  component: TemplatesRouteComponent,
})

function TemplatesRouteComponent() {
  const { t } = useLanguage()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Library}
        title={t('messageCenter.pages.templates.title')}
        description={t('messageCenter.pages.templates.description')}
        className='gap-1 p-6 md:p-6'
      />
      <CommandMgmt
        searchValue={search.search ?? ''}
        onSearchValueChange={(value) => {
          void navigate({
            search: (prev) => ({
              ...prev,
              search: value,
            }),
            replace: true,
          })
        }}
      />
    </div>
  )
}
