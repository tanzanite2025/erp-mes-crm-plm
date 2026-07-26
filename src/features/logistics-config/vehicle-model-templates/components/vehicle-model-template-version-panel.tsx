import { RotateCcw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useVehicleModelTemplateVersionHistory } from '../hooks/use-vehicle-model-template-registry'

type Props = {
  templateId: string
  currentVersion: number
  canManageTemplates: boolean
}

function formatVersionCreatedAt(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) {
    return createdAt
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getVersionHistoryErrorMessage(error: unknown): string {
  if (!error) return ''
  return error instanceof Error ? error.message : 'Unknown error'
}

export function VehicleModelTemplateVersionPanel({
  templateId,
  currentVersion,
  canManageTemplates,
}: Props) {
  const { t } = useLanguage()
  const { versions, isLoadingVersions, versionsError, restoreMutation } =
    useVehicleModelTemplateVersionHistory(templateId)
  const errorMessage = getVersionHistoryErrorMessage(versionsError)

  if (isLoadingVersions) {
    return (
      <div className='rounded-[14px] border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
        {t('logisticsConfig.vehicleModelTemplates.versionLoading')}
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className='rounded-[14px] border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] leading-5 text-destructive'>
        {t('logisticsConfig.vehicleModelTemplates.versionLoadFailed', {
          message: errorMessage,
        })}
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className='rounded-[14px] border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
        {t('logisticsConfig.vehicleModelTemplates.versionEmpty')}
      </div>
    )
  }

  return (
    <div className='space-y-2 rounded-[14px] border border-dashed border-border/60 bg-muted/10 p-2'>
      {versions.map((version) => {
        const isCurrent = version.version === currentVersion
        const isRestoring = restoreMutation.isPending

        return (
          <div
            key={`${version.templateId}:${version.version}`}
            className='flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border/60 bg-background/80 px-2 py-1.5 text-[10px]'
          >
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-1'>
                <span className='font-black text-foreground'>
                  {t('logisticsConfig.vehicleModelTemplates.version')} v
                  {version.version}
                </span>
                {isCurrent ? (
                  <span className='rounded-full bg-primary/10 px-2 py-0.5 font-black text-primary'>
                    {t('logisticsConfig.vehicleModelTemplates.currentVersion')}
                  </span>
                ) : null}
              </div>
              <div className='mt-1 truncate text-muted-foreground'>
                {formatVersionCreatedAt(version.createdAt)} ·{' '}
                {version.sourceAssetName}
              </div>
            </div>

            <button
              type='button'
              disabled={!canManageTemplates || isCurrent || isRestoring}
              onClick={() => restoreMutation.mutate(version.version)}
              className='inline-flex h-7 items-center gap-1 rounded-full border border-border/70 bg-background px-2 font-black text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
            >
              <RotateCcw className='size-3' />
              {t('logisticsConfig.vehicleModelTemplates.restoreVersion')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
