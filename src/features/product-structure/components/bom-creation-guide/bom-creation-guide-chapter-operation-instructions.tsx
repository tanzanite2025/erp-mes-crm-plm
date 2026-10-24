import { type TranslationKey } from '@/locales'
import { useLanguage } from '@/context/language-provider'
import { bomCreationOperationGuideChapterInstructionKeys } from '../../data/bom-creation-operation-guide-section-definitions'

export function BOMCreationGuideChapterOperationInstructions({
  chapter,
}: {
  chapter: keyof typeof bomCreationOperationGuideChapterInstructionKeys
}) {
  const { t } = useLanguage()
  return (
    <section className='space-y-3 rounded-xl border bg-muted/25 p-4'>
      <h3 className='text-sm font-semibold'>
        {t('engineering.bomCreationGuide.operationStepsTitle')}
      </h3>
      <ol className='space-y-3'>
        {bomCreationOperationGuideChapterInstructionKeys[chapter].map(
          (stepKey, index) => (
            <li
              key={stepKey}
              className='flex items-start gap-3 text-sm leading-7'
            >
              <span
                aria-hidden='true'
                className='flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold'
              >
                {index + 1}
              </span>
              <p className='min-w-0 text-muted-foreground'>
                {t(
                  `engineering.bomCreationGuide.operationSteps.${chapter}.${stepKey}` as TranslationKey
                )}
              </p>
            </li>
          )
        )}
      </ol>
    </section>
  )
}
