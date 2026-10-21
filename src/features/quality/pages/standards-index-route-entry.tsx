import { getRouteApi, Outlet, useChildMatches } from '@tanstack/react-router'
import { StandardsIndexPage } from './standards-index-page'

const qualityStandardsRoute = getRouteApi('/_authenticated/quality/standards')

export function StandardsIndexRouteEntry() {
  const search = qualityStandardsRoute.useSearch()
  const navigate = qualityStandardsRoute.useNavigate()
  const hasActiveChildRoute = useChildMatches({
    select: (matches) => matches.length > 0,
  })

  if (hasActiveChildRoute) {
    return <Outlet />
  }

  return <StandardsIndexPage search={search} navigate={navigate} />
}
