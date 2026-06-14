import { useLanguage } from '@/context/language-provider'
import type {
  PrepregCleanedDimensionFields,
  PrepregCleanedResinBatchFields,
} from '../data/prepreg-material-spec-schema'

interface PrepregCleanedPreviewProps {
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
}

export function PrepregCleanedPreview({
  cleanedDimensions,
  cleanedResinBatch,
}: PrepregCleanedPreviewProps) {
  const { t } = useLanguage()
  const dimensionDerivationLabel = (() => {
    if (cleanedDimensions.derivation === 'manual') {
      return t('rawMaterials.catalog.cleanedPreview.dimensionDerivation.manual')
    }
    if (cleanedDimensions.derivation === 'length_from_area') {
      return t(
        'rawMaterials.catalog.cleanedPreview.dimensionDerivation.lengthFromArea'
      )
    }
    if (cleanedDimensions.derivation === 'area_from_length') {
      return t(
        'rawMaterials.catalog.cleanedPreview.dimensionDerivation.areaFromLength'
      )
    }
    return t(
      'rawMaterials.catalog.cleanedPreview.dimensionDerivation.widthFromAreaAndLength'
    )
  })()

  return (
    <div className='rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3 md:col-span-4'>
      <div className='text-[10px] font-black tracking-[0.2em] text-primary/80 uppercase'>
        {t('rawMaterials.catalog.cleanedPreview.title')}
      </div>
      <p className='mt-1 text-[11px] font-semibold text-muted-foreground'>
        {t('rawMaterials.catalog.cleanedPreview.description')}
      </p>
      <div className='mt-2 grid gap-2 md:grid-cols-3'>
        <div className='rounded-lg bg-background/80 px-2.5 py-2 text-[11px] font-bold'>
          {t('rawMaterials.catalog.cleanedPreview.resinContent')}:{' '}
          {cleanedResinBatch.resinContentPercent
            ? `${cleanedResinBatch.resinContentPercent}%`
            : '--'}
        </div>
        <div className='rounded-lg bg-background/80 px-2.5 py-2 text-[11px] font-bold'>
          {t('rawMaterials.catalog.cleanedPreview.supplierBatchNo')}:{' '}
          {cleanedResinBatch.supplierBatchNo || '--'}
        </div>
        <div className='rounded-lg bg-background/80 px-2.5 py-2 text-[11px] font-bold'>
          {t('rawMaterials.catalog.cleanedPreview.widthMm')}:{' '}
          {cleanedDimensions.widthMm ? `${cleanedDimensions.widthMm} mm` : '--'}
        </div>
        <div className='rounded-lg bg-background/80 px-2.5 py-2 text-[11px] font-bold'>
          {t('rawMaterials.catalog.cleanedPreview.lengthM')}:{' '}
          {cleanedDimensions.lengthM ? `${cleanedDimensions.lengthM} m` : '--'}
        </div>
        <div className='rounded-lg bg-background/80 px-2.5 py-2 text-[11px] font-bold'>
          {t('rawMaterials.catalog.cleanedPreview.nominalAreaM2')}:{' '}
          {cleanedDimensions.nominalAreaM2
            ? `${cleanedDimensions.nominalAreaM2} m2`
            : '--'}
        </div>
      </div>
      <p className='mt-2 text-[10px] font-bold text-muted-foreground'>
        {t('rawMaterials.catalog.cleanedPreview.resinDerivation')}
        {cleanedResinBatch.derivation === 'manual'
          ? t('rawMaterials.catalog.cleanedPreview.resinDerivationManual')
          : t('rawMaterials.catalog.cleanedPreview.resinDerivationFromRaw')}
      </p>
      {cleanedResinBatch.notes.map((note) => (
        <p key={note} className='mt-1 text-[10px] font-bold text-amber-700'>
          {t(note as never)}
        </p>
      ))}
      <p className='mt-2 text-[10px] font-bold text-muted-foreground'>
        {t('rawMaterials.catalog.cleanedPreview.dimensionDerivationLabel')}
        {dimensionDerivationLabel}
      </p>
      {cleanedDimensions.notes.map((note) => (
        <p key={note} className='mt-1 text-[10px] font-bold text-amber-700'>
          {t(note as never)}
        </p>
      ))}
    </div>
  )
}
