import { type ReactNode, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, Check, Layers, Scale } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { BOMCreationGuideChapterOperationInstructions } from '../components/bom-creation-guide/bom-creation-guide-chapter-operation-instructions'
import { ProductAndBOMResponsibilityGuideWithBusinessEntryActions } from '../components/bom-creation-guide/product-and-bom-responsibility-guide-with-business-entry-actions'
import {
  BOMFieldBusinessMeaningExplanation,
  BOMFieldBusinessMeaningHelpPopover,
} from '../components/bom-field-business-meaning-help-popover'
import {
  bomCreationOperationGuideChecklistKeys,
  bomCreationOperationGuideLifecycleStageKeys,
  bomCreationOperationGuideManufacturingDerivationStepKeys,
  bomCreationOperationGuideProductFieldKeys,
  bomCreationOperationGuideProductRecordKeys,
  bomCreationOperationGuideRecipeFieldKeys,
  bomCreationOperationGuideReferencePages,
  bomCreationOperationGuideSectionKeys,
  bomCreationOperationGuideVersionConceptKeys,
} from '../data/bom-creation-operation-guide-section-definitions'

function BOMCreationOperationGuideSection({
  sectionKey,
  children,
}: {
  sectionKey: (typeof bomCreationOperationGuideSectionKeys)[number]
  children: ReactNode
}) {
  const { t } = useLanguage()
  const sectionNumber =
    bomCreationOperationGuideSectionKeys.indexOf(sectionKey) + 1
  return (
    <TabsContent value={sectionKey} className='m-0 min-w-0 space-y-4'>
      <div className='space-y-2'>
        <h2
          id={`bom-creation-guide-${sectionKey}-title`}
          className='flex items-start gap-3 text-base leading-7 font-semibold'
        >
          <span
            aria-hidden='true'
            className='text-xs leading-7 font-semibold text-sky-600 dark:text-sky-400'
          >
            {String(sectionNumber).padStart(2, '0')}
          </span>
          {t(`engineering.bomCreationGuide.${sectionKey}.title`)}
        </h2>
        <p className='text-sm leading-7 text-muted-foreground'>
          {t(`engineering.bomCreationGuide.${sectionKey}.description`)}
        </p>
      </div>
      {children}
    </TabsContent>
  )
}

/** Chapter explanations compose independent action adapters; BOM rules remain in the editor. */
export function BOMCreationOperationGuidePage() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const readingAreaRef = useRef<HTMLDivElement>(null)
  const accessibleReferencePages =
    bomCreationOperationGuideReferencePages.filter((page) =>
      matchesPathPermissionProjection(user, page.href)
    )

  function resetBOMCreationGuideChapterReadingPosition() {
    if (readingAreaRef.current) readingAreaRef.current.scrollTop = 0
  }

  return (
    <Tabs
      defaultValue='purpose'
      onValueChange={resetBOMCreationGuideChapterReadingPosition}
      className='@container mx-2 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden md:mx-4'
    >
      <header className='shrink-0 space-y-2 overflow-hidden rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 via-background to-indigo-50 p-4 sm:space-y-3 sm:p-5 dark:border-sky-900/60 dark:from-sky-950/40 dark:to-indigo-950/30'>
        <p className='flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-700 dark:text-sky-300'>
          <BookOpen aria-hidden='true' className='size-4 shrink-0' />
          {t('engineering.bomCreationGuide.domainLabel')}
        </p>
        <h1 className='text-xl font-semibold tracking-tight @3xl:text-3xl'>
          {t('engineering.bomCreationGuide.title')}
        </h1>
        <p className='max-w-[75ch] text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7'>
          {t('engineering.bomCreationGuide.introduction')}
        </p>
      </header>

      <TabsList
        aria-label={t('engineering.bomCreationGuide.contentsLabel')}
        className='grid h-auto w-full shrink-0 grid-cols-5 items-stretch gap-1 rounded-none border-b bg-transparent p-0 pb-3 sm:flex sm:flex-wrap sm:justify-start'
      >
        {bomCreationOperationGuideSectionKeys.map((sectionKey, index) => (
          <TabsTrigger
            key={sectionKey}
            value={sectionKey}
            aria-label={t(
              `engineering.bomCreationGuide.sections.${sectionKey}`
            )}
            className='h-full min-h-9 min-w-0 flex-none flex-col justify-start gap-1 rounded-lg px-1 py-2 text-[11px] leading-4 font-medium whitespace-normal text-muted-foreground shadow-none transition-colors hover:bg-sky-50 hover:text-sky-800 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-900 data-[state=active]:shadow-none sm:h-auto sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:text-sm sm:leading-5 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-sky-950 dark:data-[state=active]:text-sky-100'
          >
            <span
              aria-hidden='true'
              className='text-[11px] font-semibold text-sky-600/80 dark:text-sky-400'
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className='min-w-0 wrap-break-word sm:hidden'>
              {t(
                `engineering.bomCreationGuide.shortSectionLabels.${sectionKey}`
              )}
            </span>
            <span className='hidden sm:inline'>
              {t(`engineering.bomCreationGuide.sections.${sectionKey}`)}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div
        ref={readingAreaRef}
        role='region'
        aria-label={t('engineering.bomCreationGuide.readingAreaLabel')}
        className='min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [scrollbar-gutter:stable]'
      >
        <div className='grid min-w-0 items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_18rem]'>
          <div className='min-w-0'>
            <BOMCreationOperationGuideSection sectionKey='purpose'>
              <ProductAndBOMResponsibilityGuideWithBusinessEntryActions />
              <BOMCreationGuideChapterOperationInstructions chapter='purpose' />
              <dl className='grid gap-3 @2xl:grid-cols-3'>
                {bomCreationOperationGuideProductRecordKeys.map((recordKey) => (
                  <div
                    key={recordKey}
                    className='min-w-0 space-y-2 rounded-xl border bg-card p-4'
                  >
                    <dt className='text-sm font-semibold'>
                      {t(
                        `engineering.bomCreationGuide.purpose.records.${recordKey}.title`
                      )}
                    </dt>
                    <dd className='text-sm leading-7 text-muted-foreground'>
                      {t(
                        `engineering.bomCreationGuide.purpose.records.${recordKey}.description`
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className='rounded-lg border-l-2 border-sky-300 bg-sky-50/60 px-4 py-3 text-sm leading-7 text-muted-foreground dark:border-sky-700 dark:bg-sky-950/25'>
                {t('engineering.bomCreationGuide.purpose.example')}
              </p>
            </BOMCreationOperationGuideSection>

            <BOMCreationOperationGuideSection sectionKey='product'>
              <BOMCreationGuideChapterOperationInstructions chapter='product' />
              <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
                {bomCreationOperationGuideProductFieldKeys.map((fieldKey) => (
                  <div
                    key={fieldKey}
                    className='grid gap-2 py-4 @3xl:grid-cols-[10rem_minmax(0,1fr)] @3xl:gap-5'
                  >
                    <dt className='flex items-center gap-1 text-sm leading-7 font-semibold'>
                      {t(
                        `engineering.bomCreationGuide.product.fields.${fieldKey}.title`
                      )}
                      {fieldKey === 'ownership' && (
                        <BOMFieldBusinessMeaningHelpPopover
                          topic='ownership'
                          fieldLabel={t(
                            'engineering.bomCreationGuide.product.fields.ownership.title'
                          )}
                        />
                      )}
                    </dt>
                    <dd className='text-sm leading-7 text-muted-foreground'>
                      {t(
                        `engineering.bomCreationGuide.product.fields.${fieldKey}.description`
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className='text-xs leading-6 text-muted-foreground'>
                {t('engineering.bomCreationGuide.product.hint')}
              </p>
            </BOMCreationOperationGuideSection>

            <BOMCreationOperationGuideSection sectionKey='performance'>
              <BOMCreationGuideChapterOperationInstructions chapter='performance' />
              <dl className='grid gap-3 @2xl:grid-cols-3'>
                {bomCreationOperationGuideVersionConceptKeys.map(
                  (conceptKey) => (
                    <div
                      key={conceptKey}
                      className='min-w-0 space-y-2 rounded-xl border bg-card p-4'
                    >
                      <dt className='text-sm font-semibold'>
                        {t(
                          `engineering.bomCreationGuide.performance.concepts.${conceptKey}.title`
                        )}
                      </dt>
                      <dd className='space-y-3 text-sm leading-7 text-muted-foreground'>
                        <p>
                          {t(
                            `engineering.bomCreationGuide.performance.concepts.${conceptKey}.meaning`
                          )}
                        </p>
                        <p className='rounded-lg bg-muted/50 px-3 py-2 text-xs leading-6'>
                          <span className='mr-2 font-medium text-foreground'>
                            {t('engineering.bomCreationGuide.exampleLabel')}
                          </span>
                          {t(
                            `engineering.bomCreationGuide.performance.concepts.${conceptKey}.example`
                          )}
                        </p>
                      </dd>
                    </div>
                  )
                )}
              </dl>
              <section
                aria-labelledby='bom-creation-guide-weight-title'
                className='space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 sm:p-5 dark:border-sky-900 dark:bg-sky-950/20'
              >
                <h3
                  id='bom-creation-guide-weight-title'
                  className='flex items-center gap-2 text-sm font-semibold'
                >
                  <Scale
                    aria-hidden='true'
                    className='size-4 shrink-0 text-sky-600 dark:text-sky-400'
                  />
                  {t('engineering.bomCreationGuide.performance.weightTitle')}
                </h3>
                <p className='text-sm leading-7'>
                  {t(
                    'engineering.bomCreationGuide.performance.weightDescription'
                  )}
                </p>
                <p className='rounded-lg bg-background/80 px-3 py-3 text-sm leading-7 text-muted-foreground'>
                  {t('engineering.bomCreationGuide.performance.weightScope')}
                </p>
                <p className='text-sm leading-7 text-muted-foreground'>
                  {t(
                    'engineering.bomCreationGuide.performance.weightOperation'
                  )}
                </p>
                <div className='space-y-2 border-t border-sky-200/70 pt-3 text-xs leading-6 text-muted-foreground dark:border-sky-900/60'>
                  <p>
                    {t('engineering.bomCreationGuide.performance.weightDraft')}
                  </p>
                  <p>
                    {t(
                      'engineering.bomCreationGuide.performance.weightComparison'
                    )}
                  </p>
                </div>
              </section>
            </BOMCreationOperationGuideSection>

            <BOMCreationOperationGuideSection sectionKey='recipe'>
              <BOMCreationGuideChapterOperationInstructions chapter='recipe' />
              <section
                aria-labelledby='bom-creation-guide-groups-title'
                className='space-y-3 rounded-xl border bg-card p-4 sm:p-5'
              >
                <h3
                  id='bom-creation-guide-groups-title'
                  className='flex items-center gap-2 text-sm font-semibold'
                >
                  <Layers
                    aria-hidden='true'
                    className='size-4 shrink-0 text-sky-600 dark:text-sky-400'
                  />
                  {t('engineering.bomCreationGuide.recipe.groupTitle')}
                </h3>
                <p className='text-sm leading-7'>
                  {t('engineering.bomCreationGuide.recipe.groupDescription')}
                </p>
                <p className='text-sm leading-7 text-muted-foreground'>
                  {t('engineering.bomCreationGuide.recipe.groupShared')}
                </p>
                <div className='space-y-2 border-t pt-3 text-xs leading-6 text-muted-foreground'>
                  <p>{t('engineering.bomCreationGuide.recipe.groupDefault')}</p>
                  <p>
                    {t('engineering.bomCreationGuide.recipe.groupBoundary')}
                  </p>
                </div>
              </section>
              <dl className='grid gap-3 @2xl:grid-cols-2'>
                {bomCreationOperationGuideRecipeFieldKeys.map((fieldKey) => (
                  <div
                    key={fieldKey}
                    className='min-w-0 space-y-2 rounded-xl border bg-card p-4'
                  >
                    <dt className='text-sm font-semibold'>
                      {t(
                        `engineering.bomCreationGuide.recipe.fields.${fieldKey}.title`
                      )}
                    </dt>
                    <dd className='text-sm leading-7 text-muted-foreground'>
                      {t(
                        `engineering.bomCreationGuide.recipe.fields.${fieldKey}.description`
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </BOMCreationOperationGuideSection>

            <BOMCreationOperationGuideSection sectionKey='lifecycle'>
              <section
                aria-labelledby='bom-creation-guide-lifecycle-meaning-title'
                className='space-y-3 rounded-xl border bg-card p-4 sm:p-5'
              >
                <h3
                  id='bom-creation-guide-lifecycle-meaning-title'
                  className='text-sm font-semibold'
                >
                  {t('engineering.bomCreationGuide.lifecycle.meaningTitle')}
                </h3>
                <BOMFieldBusinessMeaningExplanation topic='lifecycle' />
              </section>
              <ol className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
                {bomCreationOperationGuideLifecycleStageKeys.map(
                  (stageKey, index) => (
                    <li key={stageKey} className='flex items-start gap-3 py-4'>
                      <span
                        aria-hidden='true'
                        className='flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                      >
                        {index + 1}
                      </span>
                      <div className='min-w-0 space-y-1.5'>
                        <h3 className='text-sm leading-7 font-semibold'>
                          {t(
                            `engineering.bomCreationGuide.lifecycle.stages.${stageKey}.title`
                          )}
                        </h3>
                        <p className='text-sm leading-7 text-muted-foreground'>
                          {t(
                            `engineering.bomCreationGuide.lifecycle.stages.${stageKey}.description`
                          )}
                        </p>
                      </div>
                    </li>
                  )
                )}
              </ol>
              <section
                aria-labelledby='bom-creation-guide-manufacturing-derivation-title'
                className='space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 sm:p-5 dark:border-sky-900 dark:bg-sky-950/20'
              >
                <h3
                  id='bom-creation-guide-manufacturing-derivation-title'
                  className='text-sm font-semibold'
                >
                  {t('engineering.bomCreationGuide.lifecycle.derivationTitle')}
                </h3>
                <p className='text-sm leading-7 text-muted-foreground'>
                  {t(
                    'engineering.bomCreationGuide.lifecycle.derivationDescription'
                  )}
                </p>
                <ol className='divide-y divide-sky-200/70 dark:divide-sky-900/60'>
                  {bomCreationOperationGuideManufacturingDerivationStepKeys.map(
                    (stepKey, index) => (
                      <li key={stepKey} className='flex items-start gap-3 py-4'>
                        <span
                          aria-hidden='true'
                          className='flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-sky-700 dark:text-sky-300'
                        >
                          {index + 1}
                        </span>
                        <div className='min-w-0 space-y-1.5'>
                          <h4 className='text-sm leading-7 font-semibold'>
                            {t(
                              `engineering.bomCreationGuide.lifecycle.derivationSteps.${stepKey}.title`
                            )}
                          </h4>
                          <p className='text-sm leading-7 text-muted-foreground'>
                            {t(
                              `engineering.bomCreationGuide.lifecycle.derivationSteps.${stepKey}.description`
                            )}
                          </p>
                        </div>
                      </li>
                    )
                  )}
                </ol>
              </section>
              <p className='text-xs leading-6 text-muted-foreground'>
                {t('engineering.bomCreationGuide.lifecycle.layoutHint')}
              </p>
            </BOMCreationOperationGuideSection>
          </div>

          <aside className='min-w-0 space-y-5'>
            <section
              aria-labelledby='bom-creation-guide-checklist-title'
              className='space-y-3 rounded-2xl border border-sky-200/70 bg-sky-50/45 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/20'
            >
              <h2
                id='bom-creation-guide-checklist-title'
                className='text-base font-semibold'
              >
                {t('engineering.bomCreationGuide.checklistTitle')}
              </h2>
              <p className='text-xs leading-6 text-muted-foreground'>
                {t('engineering.bomCreationGuide.checklistDescription')}
              </p>
              <ul className='space-y-3'>
                {bomCreationOperationGuideChecklistKeys.map((checkKey) => (
                  <li
                    key={checkKey}
                    className='flex items-start gap-2 text-sm leading-7'
                  >
                    <Check
                      aria-hidden='true'
                      className='mt-1.5 size-4 shrink-0 text-sky-600 dark:text-sky-400'
                    />
                    {t(`engineering.bomCreationGuide.checklist.${checkKey}`)}
                  </li>
                ))}
              </ul>
            </section>
            {accessibleReferencePages.length > 0 && (
              <section
                aria-labelledby='bom-creation-guide-references-title'
                className='space-y-3 rounded-xl border bg-card p-4 sm:p-5'
              >
                <h2
                  id='bom-creation-guide-references-title'
                  className='text-sm font-semibold'
                >
                  {t('engineering.bomCreationGuide.references.title')}
                </h2>
                <ul className='space-y-2'>
                  {accessibleReferencePages.map((page) => (
                    <li key={page.key}>
                      <Link
                        to={page.href}
                        className='flex items-center justify-between gap-2 rounded-lg py-2 text-sm text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-sky-300'
                      >
                        {t(
                          `engineering.bomCreationGuide.references.${page.key}`
                        )}
                        <ArrowRight
                          aria-hidden='true'
                          className='size-4 shrink-0'
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </Tabs>
  )
}
