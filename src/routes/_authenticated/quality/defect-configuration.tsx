import { createFileRoute } from '@tanstack/react-router'
import { QualityDefectTypeConfigurationPage } from '@/features/quality/pages/quality-defect-type-configuration-page'

export const Route = createFileRoute(
  '/_authenticated/quality/defect-configuration'
)({
  component: QualityDefectTypeConfigurationPage,
})
