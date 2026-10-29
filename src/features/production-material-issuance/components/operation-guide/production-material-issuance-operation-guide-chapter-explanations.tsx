import { Link } from '@tanstack/react-router'
import { ArrowRight, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type ProductionMaterialIssuanceOperationGuideChapter,
  productionMaterialIssuanceOperationGuideReferencePages,
} from '../../data/production-material-issuance-operation-guide-chapter-definitions'
import { ProductionMaterialIssuanceQuantityMeaningHelpPopover } from '../production-material-issuance-quantity-meaning-help-popover'
import { ProductionMaterialIssuanceStartWorkflowNavigationLink } from '../production-material-issuance-start-workflow-navigation-link'

/** Explains planned operations without requesting orders, opening editors, or posting inventory. */
export function ProductionMaterialIssuanceOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: ProductionMaterialIssuanceOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const permittedReferenceKeys = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      productionMaterialIssuanceOperationGuideReferencePages[key]
    )
  )
  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        {(chapter.key === 'scope' || chapter.key === 'dispatch') && (
          <section className='space-y-3 rounded-xl border border-dashed bg-card p-4'>
            <h3 className='text-sm font-semibold'>
              {t('mrp.productionMaterialIssuance.start.guideQuickStart')}
            </h3>
            <p className='text-sm leading-7 text-muted-foreground'>
              {t('mrp.productionMaterialIssuance.start.guideQuickStartHint')}
            </p>
            <ProductionMaterialIssuanceStartWorkflowNavigationLink />
          </section>
        )}
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(
              `mrp.productionMaterialIssuanceGuide.chapters.${chapter.key}.title`
            )}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `mrp.productionMaterialIssuanceGuide.chapters.${chapter.key}.description`
            )}
          </p>
        </div>
        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(
              `mrp.productionMaterialIssuanceGuide.chapters.${chapter.key}.noticeTitle`
            )}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(
              `mrp.productionMaterialIssuanceGuide.chapters.${chapter.key}.noticeDescription`
            )}
          </p>
        </section>
        {chapter.key === 'movements' && (
          <ProductionMaterialIssuanceOperationGuideIssueAndReturnExample />
        )}
        <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
          {chapter.topics.map((topic) => (
            <div key={topic} className='space-y-2 py-4'>
              <dt className='text-sm leading-6 font-semibold'>
                {t(`mrp.productionMaterialIssuanceGuide.topics.${topic}.title`)}
              </dt>
              <dd className='text-sm leading-7 text-muted-foreground'>
                {t(
                  `mrp.productionMaterialIssuanceGuide.topics.${topic}.description`
                )}
              </dd>
            </div>
          ))}
        </dl>
      </article>
      {permittedReferenceKeys.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('mrp.productionMaterialIssuanceGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('mrp.productionMaterialIssuanceGuide.referenceDescription')}
          </p>
          <ul className='space-y-2'>
            {permittedReferenceKeys.map((key) => (
              <li key={key}>
                <Link
                  to={
                    productionMaterialIssuanceOperationGuideReferencePages[key]
                  }
                  className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(`mrp.productionMaterialIssuanceGuide.references.${key}`)}
                  <ArrowRight aria-hidden='true' className='size-4 shrink-0' />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}

function ProductionMaterialIssuanceOperationGuideIssueAndReturnExample() {
  const { t } = useLanguage()
  return (
    <section className='min-w-0 space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 dark:border-sky-900 dark:bg-sky-950/20'>
      <h3 className='text-sm font-semibold'>
        {t('mrp.productionMaterialIssuanceGuide.example.title')}
      </h3>
      <p className='text-sm leading-7'>
        {t('mrp.productionMaterialIssuanceGuide.example.assumption')}
      </p>
      <ol className='space-y-2 text-sm leading-7'>
        {(['firstIssue', 'nextIssue', 'supplement', 'return'] as const).map(
          (step) => (
            <li key={step} className='rounded-lg bg-background/80 px-3 py-2'>
              {t(`mrp.productionMaterialIssuanceGuide.example.${step}`)}
            </li>
          )
        )}
      </ol>
      <ProductionMaterialIssuanceQuantityMeaningHelpPopover />
    </section>
  )
}
