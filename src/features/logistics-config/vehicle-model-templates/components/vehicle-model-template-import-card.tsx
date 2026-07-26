'use client'

import { useMemo, useState } from 'react'
import {
  AssetService,
  ASSET_TRANSACTION_INTENT_VEHICLE_MODEL_TEMPLATE_UPLOAD,
  VEHICLE_MODEL_TEMPLATE_UPLOAD_MAX_FILE_SIZE_MB,
} from '@/services/asset-service'
import { Box, FileText } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileUploader } from '@/components/file-uploader'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { VEHICLE_MODEL_TEMPLATE_ACCEPT } from '../../shared/vehicle-model-template.types'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import type {
  VehicleModelTemplateDTO,
  VehicleModelTemplateSourceAsset,
} from '../data/vehicle-model-templates.types'
import { useVehicleModelTemplateRegistry } from '../hooks/use-vehicle-model-template-registry'
import {
  buildVehicleModelTemplateFromVehicleSpec,
  formatVehicleModelTemplateSourceLabel,
  inferVehicleModelTemplateSourceFormat,
} from '../services/vehicle-model-template-registry'
import { VehicleModelTemplateRegistryList } from './vehicle-model-template-registry-list'

type Props = {
  vehicleSpecs: VehicleSpec[]
  isLoading: boolean
}

export function VehicleModelTemplateImportCard({
  vehicleSpecs,
  isLoading,
}: Props) {
  const { t } = useLanguage()
  const firstVehicleSpec = vehicleSpecs[0]
  const [seedVehicleSpecId, setSeedVehicleSpecId] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [sourceAsset, setSourceAsset] = useState<
    VehicleModelTemplateSourceAsset | undefined
  >(undefined)
  const [editingTemplateId, setEditingTemplateId] = useState<
    string | undefined
  >(undefined)
  const [isUploadingSource, setIsUploadingSource] = useState(false)
  const [sourceUploadError, setSourceUploadError] = useState<string | null>(
    null
  )
  const { allowsAction, isChecking: isCheckingPermissions } =
    usePermissionActions()
  const canManageTemplates =
    !isCheckingPermissions && allowsAction('perm_manage')

  const effectiveSeedVehicleSpecId =
    seedVehicleSpecId || firstVehicleSpec?.id || ''

  const selectedVehicleSpec = useMemo(
    () =>
      vehicleSpecs.find((item) => item.id === effectiveSeedVehicleSpecId) ??
      firstVehicleSpec ??
      null,
    [effectiveSeedVehicleSpecId, firstVehicleSpec, vehicleSpecs]
  )

  const previewTemplate = useMemo(() => {
    if (!selectedVehicleSpec) return null

    return buildVehicleModelTemplateFromVehicleSpec({
      vehicleSpec: selectedVehicleSpec,
      sourceAsset,
      templateName: templateName.trim() || undefined,
    })
  }, [selectedVehicleSpec, sourceAsset, templateName])

  const { templates, isLoadingTemplates, templatesError, saveMutation } =
    useVehicleModelTemplateRegistry(selectedVehicleSpec?.id)

  const handleSeedChange = (vehicleSpecId: string) => {
    setSeedVehicleSpecId(vehicleSpecId)
    setTemplateName('')
    setEditingTemplateId(undefined)
    setSourceAsset(undefined)
    setSourceUploadError(null)
  }

  const handleUploadChange = (
    storageKey: string,
    extension?: string,
    fileName?: string
  ) => {
    if (!storageKey) {
      setSourceAsset(undefined)
      setSourceUploadError(null)
      return
    }

    setSourceUploadError(null)
    const resolvedFileName =
      fileName || storageKey.split('/').pop() || storageKey
    const sourceFormat = inferVehicleModelTemplateSourceFormat(
      fileName || extension || resolvedFileName
    )
    if (sourceFormat === 'seed-spec') {
      setSourceAsset(undefined)
      setSourceUploadError('车型模型模板源文件只允许上传 GLB。')
      return
    }

    setSourceAsset({
      url: storageKey,
      fileName: resolvedFileName,
      format: sourceFormat,
    })
  }

  const handleEditTemplate = (template: VehicleModelTemplateDTO) => {
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    if (template.sourceFormat === 'seed-spec') {
      setSourceAsset(undefined)
      setSourceUploadError('种子车型没有 GLB 源文件，不能作为上传模板编辑。')
      return
    }
    setSourceAsset({
      url: template.sourceAssetUrl,
      fileName: template.sourceAssetName,
      format: template.sourceFormat,
    })
    setSourceUploadError(null)
  }

  const uploadModelTemplateSource = async (file: File) => {
    setIsUploadingSource(true)
    setSourceUploadError(null)

    try {
      const uploaded = await AssetService.uploadFile(
        file,
        ASSET_TRANSACTION_INTENT_VEHICLE_MODEL_TEMPLATE_UPLOAD
      )
      return {
        url: uploaded.url,
        extension: file.name.split('.').pop()?.toLowerCase(),
        fileName: uploaded.fileName,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown upload error'
      setSourceUploadError(message)
      throw error
    } finally {
      setIsUploadingSource(false)
    }
  }

  const handleSaveTemplate = () => {
    if (!selectedVehicleSpec || !sourceAsset || !previewTemplate) return

    saveMutation.mutate({
      id: editingTemplateId,
      name: previewTemplate.name,
      seedVehicleSpecId: selectedVehicleSpec.id,
      sourceAsset: {
        url: sourceAsset.url,
        fileName: sourceAsset.fileName,
        format: sourceAsset.format,
      },
      status: 'uploaded',
      normalizedFootprint: previewTemplate.normalizedFootprint,
      notes: previewTemplate.notes,
    })
  }

  return (
    <Card className='overflow-hidden rounded-[26px] border border-dashed border-border/60 bg-background/80 shadow-none'>
      <CardHeader className='space-y-1 border-b border-dashed border-border/60 px-4 py-3'>
        <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tight'>
          <Box className='size-4 text-primary' />
          {t('logisticsConfig.vehicleModelTemplates.title')}
        </CardTitle>
        <div className='text-[11px] leading-relaxed text-muted-foreground'>
          {t('logisticsConfig.vehicleModelTemplates.description')}
        </div>
      </CardHeader>

      <CardContent className='grid gap-4 p-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]'>
        <div className='space-y-3'>
          <div className='space-y-1.5'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('logisticsConfig.vehicleModelTemplates.seedVehicle')}
            </div>
            <Select
              value={effectiveSeedVehicleSpecId}
              onValueChange={handleSeedChange}
              disabled={isLoading || vehicleSpecs.length === 0}
            >
              <SelectTrigger className='h-10 rounded-xl text-[13px]'>
                <SelectValue
                  placeholder={t(
                    'logisticsConfig.vehicleModelTemplates.seedVehicle'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {vehicleSpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('logisticsConfig.vehicleModelTemplates.templateName')}
            </div>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={
                selectedVehicleSpec
                  ? `${selectedVehicleSpec.name} 模板`
                  : t('logisticsConfig.vehicleModelTemplates.templateName')
              }
              className='h-10 rounded-xl border-border/70 bg-background text-[13px]'
            />
          </div>

          <div className='space-y-1.5'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('logisticsConfig.vehicleModelTemplates.sourceAsset')}
            </div>
            <FileUploader
              value={sourceAsset?.url}
              onChange={handleUploadChange}
              disabled={
                !canManageTemplates ||
                isUploadingSource ||
                saveMutation.isPending
              }
              uploadFile={uploadModelTemplateSource}
              placeholder={t(
                'logisticsConfig.vehicleModelTemplates.sourcePlaceholder'
              )}
              accept={VEHICLE_MODEL_TEMPLATE_ACCEPT}
              maxFileSizeMb={VEHICLE_MODEL_TEMPLATE_UPLOAD_MAX_FILE_SIZE_MB}
            />
          </div>

          <div className='rounded-[18px] border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary/80'>
            {t('logisticsConfig.vehicleModelTemplates.sourceHint')}
          </div>
          {isCheckingPermissions ? (
            <div className='rounded-[16px] border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300'>
              {t('logisticsConfig.vehicleModelTemplates.permissionChecking')}
            </div>
          ) : !canManageTemplates ? (
            <div className='rounded-[16px] border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300'>
              {t('logisticsConfig.vehicleModelTemplates.permissionRequired')}
            </div>
          ) : null}
          {isUploadingSource ? (
            <div className='rounded-[16px] border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-primary'>
              {t('logisticsConfig.vehicleModelTemplates.uploading')}
            </div>
          ) : null}
          {sourceUploadError ? (
            <div className='rounded-[16px] border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive'>
              {t('logisticsConfig.vehicleModelTemplates.uploadFailed', {
                message: sourceUploadError,
              })}
            </div>
          ) : null}
        </div>

        <div className='space-y-3 rounded-[22px] border border-dashed border-border/60 bg-muted/10 p-3'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <FileText className='size-4' />
            {t('logisticsConfig.vehicleModelTemplates.currentDraft')}
          </div>

          {previewTemplate ? (
            <div className='space-y-2 text-[11px] leading-relaxed text-muted-foreground'>
              <div className='rounded-[16px] border border-border/60 bg-background/80 px-3 py-2'>
                <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('logisticsConfig.vehicleModelTemplates.seedVehicle')}
                </div>
                <div className='mt-1 text-sm font-black text-foreground'>
                  {previewTemplate.seedVehicleName}
                </div>
              </div>

              <div className='flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-dashed border-primary/20 bg-primary/5 px-3 py-2'>
                <div className='text-[10px] leading-5 text-primary/80'>
                  {isLoadingTemplates
                    ? t('logisticsConfig.vehicleModelTemplates.loading')
                    : templatesError
                      ? t(
                          'logisticsConfig.vehicleModelTemplates.registryLoadFailed',
                          {
                            message:
                              templatesError instanceof Error
                                ? templatesError.message
                                : 'Unknown error',
                          }
                        )
                      : t(
                          'logisticsConfig.vehicleModelTemplates.savedTemplateCount',
                          { count: templates.length }
                        )}
                </div>
                <button
                  type='button'
                  className='rounded-xl bg-primary px-3 py-2 text-[10px] font-black tracking-[0.14em] text-primary-foreground uppercase disabled:cursor-not-allowed disabled:opacity-50'
                  disabled={
                    !canManageTemplates ||
                    !sourceAsset ||
                    isUploadingSource ||
                    saveMutation.isPending
                  }
                  onClick={handleSaveTemplate}
                >
                  {saveMutation.isPending
                    ? t('logisticsConfig.vehicleModelTemplates.saving')
                    : editingTemplateId
                      ? t('logisticsConfig.vehicleModelTemplates.update')
                      : t('logisticsConfig.vehicleModelTemplates.save')}
                </button>
              </div>
              {saveMutation.error ? (
                <div className='rounded-[16px] border border-dashed border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] leading-5 text-destructive'>
                  {t('logisticsConfig.vehicleModelTemplates.saveFailedInline', {
                    message:
                      saveMutation.error instanceof Error
                        ? saveMutation.error.message
                        : 'Unknown error',
                  })}
                </div>
              ) : null}

              <div className='grid grid-cols-2 gap-2'>
                <div className='rounded-[16px] border border-border/60 bg-background/80 px-3 py-2'>
                  <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {t(
                      'logisticsConfig.vehicleModelTemplates.normalizedFootprint'
                    )}
                  </div>
                  <div className='mt-1 font-mono text-[11px] font-bold text-foreground'>
                    {previewTemplate.normalizedFootprint.lengthMm} ×{' '}
                    {previewTemplate.normalizedFootprint.widthMm} ×{' '}
                    {previewTemplate.normalizedFootprint.heightMm} mm
                  </div>
                </div>
                <div className='rounded-[16px] border border-border/60 bg-background/80 px-3 py-2'>
                  <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {t('logisticsConfig.vehicleModelTemplates.status')}
                  </div>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    <span className='rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary'>
                      {previewTemplate.status === 'seed-only'
                        ? t(
                            'logisticsConfig.vehicleModelTemplates.statusSeedOnly'
                          )
                        : previewTemplate.status === 'uploaded'
                          ? t(
                              'logisticsConfig.vehicleModelTemplates.statusUploaded'
                            )
                          : t(
                              'logisticsConfig.vehicleModelTemplates.statusNormalized'
                            )}
                    </span>
                    <span className='rounded-full bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground'>
                      {formatVehicleModelTemplateSourceLabel(
                        previewTemplate.sourceFormat
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className='rounded-[16px] border border-border/60 bg-background/80 px-3 py-2'>
                <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('logisticsConfig.vehicleModelTemplates.sourceAsset')}
                </div>
                <div className='mt-1 text-foreground'>
                  {previewTemplate.sourceAssetName ??
                    t('logisticsConfig.vehicleModelTemplates.sourceEmpty')}
                </div>
              </div>

              <div className='rounded-[16px] border border-dashed border-border/60 bg-background/80 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
                {previewTemplate.notes.map((item) => (
                  <div key={item}>· {item}</div>
                ))}
              </div>

              <VehicleModelTemplateRegistryList
                templates={templates}
                isLoading={isLoadingTemplates}
                error={templatesError}
                canManageTemplates={canManageTemplates}
                activeTemplateId={editingTemplateId}
                onEditTemplate={handleEditTemplate}
              />
            </div>
          ) : (
            <div className='flex h-full min-h-[180px] items-center justify-center rounded-[18px] border border-dashed border-border/60 bg-background/80 px-4 py-6 text-center text-[12px] leading-relaxed text-muted-foreground'>
              {t('logisticsConfig.vehicleModelTemplates.sourceEmpty')}
            </div>
          )}

          <div className='rounded-[16px] border border-dashed border-border/60 bg-background/80 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
            {t('logisticsConfig.vehicleModelTemplates.sourcePlaceholder')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
