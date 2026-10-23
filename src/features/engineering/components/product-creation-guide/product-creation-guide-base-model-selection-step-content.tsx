import { type ReactNode } from 'react'
import { ArrowRight, CheckCircle2, Layers3, Plus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProductCreationGuideBaseModelSelectionStepContentProps {
  baseModels: { id: string; name: string; pathLabel: string }[]
  selectedBaseModelId: string
  selectedTemplateLabel: string
  availabilityNotice: ReactNode
  onSelectedBaseModelChange: (id: string) => void
  onCreateBaseModel: () => void
}

export function ProductCreationGuideBaseModelSelectionStepContent({
  baseModels,
  selectedBaseModelId,
  selectedTemplateLabel,
  availabilityNotice,
  onSelectedBaseModelChange,
  onCreateBaseModel,
}: ProductCreationGuideBaseModelSelectionStepContentProps) {
  const { t } = useLanguage()
  const selectedBaseModel = baseModels.find(
    (model) => model.id === selectedBaseModelId
  )

  return (
    <div className='space-y-5'>
      <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,1fr)]'>
        <section
          aria-labelledby='product-creation-guide-base-model-selection-title'
          className='min-w-0 space-y-5 rounded-[24px] border-2 border-blue-400/60 bg-blue-50/50 p-5 dark:border-blue-400/50 dark:bg-blue-950/20'
        >
          <div className='flex items-start gap-3'>
            <span className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white'>
              <Layers3 aria-hidden='true' className='size-5' />
            </span>
            <div className='min-w-0 space-y-1'>
              <h3
                id='product-creation-guide-base-model-selection-title'
                className='text-base font-bold text-foreground sm:text-lg'
              >
                {t('engineering.productCreationGuide.baseModelSelectionTitle')}
              </h3>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                {t('engineering.productCreationGuide.baseModelSelectionHint')}
              </p>
            </div>
          </div>

          <div className='space-y-2.5'>
            <Label
              htmlFor='product-creation-guide-base-model-selection'
              className='text-sm font-semibold text-foreground'
            >
              {t('engineering.productCreationGuide.selectBaseModel')}
            </Label>
            <Select
              value={selectedBaseModelId}
              onValueChange={onSelectedBaseModelChange}
            >
              <SelectTrigger
                id='product-creation-guide-base-model-selection'
                aria-describedby='product-creation-guide-base-model-selection-help product-creation-guide-base-model-next-action'
                className='h-auto min-h-14 w-full rounded-2xl border-2 border-blue-400 bg-background px-4 py-3 text-left text-sm font-semibold whitespace-normal shadow-sm hover:border-blue-600 focus-visible:border-blue-600 focus-visible:ring-blue-500/20 data-placeholder:text-blue-700 data-[size=default]:h-auto dark:border-blue-400 dark:bg-background dark:data-placeholder:text-blue-300 [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:whitespace-normal [&_svg]:size-5 [&_svg]:text-blue-600 [&_svg]:opacity-100 dark:[&_svg]:text-blue-400'
              >
                <SelectValue
                  placeholder={t(
                    'engineering.productCreationGuide.baseModelSelectionPlaceholder'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {baseModels.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className='min-h-11 py-3 text-sm'
                  >
                    {model.pathLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed'>
            <span className='text-muted-foreground'>
              {t('engineering.productCreationGuide.baseModelCurrentTemplate')}
            </span>
            <span className='font-semibold text-foreground'>
              {selectedTemplateLabel}
            </span>
          </div>

          <div className='space-y-3 rounded-2xl border border-blue-200 bg-background p-4 dark:border-blue-400/30'>
            {selectedBaseModel && (
              <div className='flex items-center gap-3'>
                <CheckCircle2
                  aria-hidden='true'
                  className='size-5 shrink-0 text-blue-600 dark:text-blue-400'
                />
                <div className='min-w-0'>
                  <p className='text-xs text-muted-foreground'>
                    {t(
                      'engineering.productCreationGuide.baseModelCurrentSelection'
                    )}
                  </p>
                  <p className='mt-1 text-lg font-bold break-words text-foreground'>
                    {selectedBaseModel.name}
                  </p>
                </div>
              </div>
            )}
            <p
              id='product-creation-guide-base-model-next-action'
              className='flex items-start gap-2 text-sm leading-relaxed font-medium text-blue-700 dark:text-blue-300'
            >
              <ArrowRight
                aria-hidden='true'
                className='mt-0.5 size-4 shrink-0'
              />
              {t('engineering.productCreationGuide.baseModelNextAction', {
                action: t(
                  'engineering.productCreationGuide.confirmAndContinue'
                ),
              })}
            </p>
          </div>
        </section>

        <aside
          aria-labelledby='product-creation-guide-base-model-create-title'
          className='min-w-0 space-y-4 rounded-[24px] border bg-muted/10 p-5'
        >
          <div className='space-y-2'>
            <h3
              id='product-creation-guide-base-model-create-title'
              className='text-base font-bold text-foreground'
            >
              {t('engineering.productCreationGuide.baseModelCreateTitle')}
            </h3>
            <p className='text-sm leading-relaxed text-muted-foreground'>
              {t('engineering.productCreationGuide.baseModelCreateDescription')}
            </p>
          </div>
          <Button
            className='h-auto min-h-11 w-full gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold whitespace-normal text-white shadow-sm hover:bg-blue-700'
            onClick={onCreateBaseModel}
          >
            <Plus aria-hidden='true' className='size-4 shrink-0' />
            {t('engineering.productCreationGuide.createBaseModel')}
          </Button>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('engineering.productCreationGuide.baseModelCreateHelp')}
          </p>
        </aside>
      </div>

      <div className='space-y-2'>
        {availabilityNotice}
        <p
          id='product-creation-guide-base-model-selection-help'
          className='text-xs leading-relaxed text-muted-foreground'
        >
          {t('engineering.productCreationGuide.baseModelSelectionRule')}
        </p>
      </div>

      <section className='space-y-2 rounded-[24px] border bg-muted/10 p-5 text-sm leading-relaxed text-muted-foreground'>
        <h3 className='font-semibold text-foreground'>
          {t('engineering.productCreationGuide.baseModelMeaningTitle')}
        </h3>
        <p>{t('engineering.productCreationGuide.baseModelMeaning')}</p>
        <p>
          {t('engineering.productCreationGuide.baseModelProductCardExample')}
        </p>
        <p>
          {t('engineering.productCreationGuide.baseModelProductAndBomTiming')}
        </p>
      </section>
    </div>
  )
}
