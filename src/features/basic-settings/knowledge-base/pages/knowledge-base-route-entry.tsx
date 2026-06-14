import { getRouteApi } from '@tanstack/react-router'
import { KnowledgeBaseMgmt } from '../tabs/knowledge-base-mgmt'

const knowledgeBaseRoute = getRouteApi(
  '/_authenticated/basic-settings/knowledge-base'
)

export function KnowledgeBaseRouteEntry() {
  const search = knowledgeBaseRoute.useSearch()
  const navigate = knowledgeBaseRoute.useNavigate()

  return (
    <KnowledgeBaseMgmt
      search={search}
      onActionConsumed={() => {
        navigate({
          replace: true,
          search: (prev) => ({
            ...prev,
            action: undefined,
          }),
        })
      }}
    />
  )
}
