import { useState } from 'react'
import { Boxes, ChevronDown, PenLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { VehicleModelTemplateDTO } from '../data/vehicle-model-templates.types'
import {
  formatVehicleModelTemplateSourceLabel,
  formatVehicleModelTemplateStatusLabel,
} from '../services/vehicle-model-template-registry'
import { VehicleModelTemplateVersionPanel } from './vehicle-model-template-version-panel'

type Props = {
  templates: VehicleModelTemplateDTO[]
  isLoading: boolean
  error: unknown
  canManageTemplates: boolean
  activeTemplateId?: string
  onEditTemplate: (template: VehicleModelTemplateDTO) => void
}

function formatTemplateUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) {
    return updatedAt
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getTemplateErrorMessage(error: unknown): string {
  if (!error) return ''
  return error instanceof Error ? error.message : 'Unknown error'
}

export function VehicleModelTemplateRegistryList({
  templates,
  isLoading,
  error,
  canManageTemplates,
  activeTemplateId,
  onEditTemplate,
}: Props) {
  const { t } = useLanguage()
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(
    null
  )
  const errorMessage = getTemplateErrorMessage(error)

  return (
    <div className='space-y-2 rounded-[18px] border border-dashed border-border/60 bg-background/60 p-3'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          <Boxes className='size-3.5' />
          {t('logisticsConfig.vehicleModelTemplates.registryTitle')}
        </div>
        <span className='rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground'>
          {templates.length}
        </span>
      </div>

      {isLoading ? (
        <div className='rounded-[14px] border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
          {t('logisticsConfig.vehicleModelTemplates.loading')}
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className='rounded-[14px] border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] leading-5 text-destructive'>
          {t('logisticsConfig.vehicleModelTemplates.registryLoadFailed', {
            message: errorMessage,
          })}
        </div>
      ) : null}

      {!isLoading && !errorMessage && templates.length === 0 ? (
        <div className='rounded-[14px] border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
          {t('logisticsConfig.vehicleModelTemplates.registryEmpty')}
        </div>
      ) : null}

      {!isLoading && !errorMessage && templates.length > 0 ? (
        <div className='grid gap-2'>
          {templates.map((template, index) => {
            const isActive = template.id === activeTemplateId

            return (
              <div
                key={template.id}
                className={[
                  'rounded-[16px] border bg-background/80 px-3 py-2 transition-colors',
                  isActive
                    ? 'border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]'
                    : 'border-border/60',
                ].join(' ')}
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-xs font-black text-foreground'>
                      {template.name}
                    </div>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {index === 0 ? (
                        <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary'>
                          {t('logisticsConfig.vehicleModelTemplates.latest')}
                        </span>
                      ) : null}
                      {isActive ? (
                        <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600'>
                          {t('logisticsConfig.vehicleModelTemplates.editing')}
                        </span>
                      ) : null}
                      <span className='rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground'>
                        {formatVehicleModelTemplateSourceLabel(
                          template.sourceFormat
                        )}
                      </span>
                      <span className='rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground'>
                        {formatVehicleModelTemplateStatusLabel(template.status)}
                      </span>
                    </div>
                  </div>

                  <button
                    type='button'
                    disabled={!canManageTemplates}
                    onClick={() => onEditTemplate(template)}
                    className='inline-flex h-7 items-center gap-1 rounded-full border border-border/70 bg-background px-2 text-[10px] font-black text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <PenLine className='size-3' />
                    {t('logisticsConfig.vehicleModelTemplates.edit')}
                  </button>
                </div>

                <div className='mt-2 grid grid-cols-2 gap-2 text-[10px] leading-5 text-muted-foreground'>
                  <div className='rounded-[12px] bg-muted/30 px-2 py-1'>
                    {t('logisticsConfig.vehicleModelTemplates.version')} v
                    {template.version}
                  </div>
                  <button
                    type='button'
                    onClick={() =>
                      setExpandedTemplateId((current) =>
                        current === template.id ? null : template.id
                      )
                    }
                    className='inline-flex items-center justify-between rounded-[12px] bg-muted/30 px-2 py-1 text-left font-bold text-muted-foreground transition-colors hover:text-primary'
                  >
                    <span>
                      {t('logisticsConfig.vehicleModelTemplates.versionCount', {
                        count: template.versionCount,
                      })}
                    </span>
                    <ChevronDown
                      className={[
                        'size-3 transition-transform',
                        expandedTemplateId === template.id ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </button>
                  <div className='rounded-[12px] bg-muted/30 px-2 py-1'>
                    {formatTemplateUpdatedAt(template.updatedAt)}
                  </div>
                  <div className='col-span-2 truncate rounded-[12px] bg-muted/30 px-2 py-1'>
                    {template.sourceAssetName}
                  </div>
                </div>

                {expandedTemplateId === template.id ? (
                  <div className='mt-2'>
                    <VehicleModelTemplateVersionPanel
                      templateId={template.id}
                      currentVersion={template.version}
                      canManageTemplates={canManageTemplates}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
