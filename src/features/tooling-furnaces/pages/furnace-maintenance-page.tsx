'use client'

import { useLanguage } from '@/context/language-provider'
import { MaintenanceRecordsPage } from '@/features/equipment-maintenance/components/maintenance-records-page'

interface FurnaceMaintenancePageProps {
  assetId?: string
}

export function FurnaceMaintenancePage({
  assetId,
}: FurnaceMaintenancePageProps) {
  const { t } = useLanguage()

  return (
    <MaintenanceRecordsPage
      assetTypeScope='FURNACE'
      assetId={assetId}
      title={t('toolingFurnaces.maintenance.title')}
      description={
        assetId
          ? t('toolingFurnaces.maintenance.filteredDescription')
          : t('toolingFurnaces.maintenance.description')
      }
    />
  )
}
