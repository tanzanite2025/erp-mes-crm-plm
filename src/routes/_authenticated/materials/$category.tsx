import { createFileRoute } from '@tanstack/react-router'
import { MaterialMgmt } from '@/features/material-archive/tabs/material-mgmt'

export const Route = createFileRoute('/_authenticated/materials/$category')({
  component: MaterialCategoryPage,
})

function MaterialCategoryPage() {
  const { category } = Route.useParams()
  // 将路径参数（如 raw-materials）映射回字典中存储的 ID（如 RAW_MATERIAL）
  // 这种映射可以基于约定或直接透传。为了灵活性，我们建议 URL Segment 直接对应字典 Value。
  return <MaterialMgmt category={category} />
}
