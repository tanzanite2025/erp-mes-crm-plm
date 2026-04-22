import { getRouteApi } from '@tanstack/react-router'
import { StandardsIndexPage } from './standards-index-page'

const qualityStandardsRoute = getRouteApi('/_authenticated/quality/standards')

export function StandardsIndexRouteEntry() {
  const search = qualityStandardsRoute.useSearch()
  const navigate = qualityStandardsRoute.useNavigate()

  return <StandardsIndexPage search={search} navigate={navigate} />
}
