import { Link } from '@tanstack/react-router'
import { ArrowRight, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type PartRequirementsOperationGuideChapter,
  partRequirementsOperationGuideReferencePages,
} from '../../data/part-requirements-operation-guide-chapter-definitions'

/** Displays domain explanations only; no API requests or business mutations. */
export function PartRequirementsOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: PartRequirementsOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessibleReferenceKeys = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      partRequirementsOperationGuideReferencePages[key]
    )
  )

  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(`mrp.operationGuide.chapters.${chapter.key}.title`)}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(`mrp.operationGuide.chapters.${chapter.key}.description`)}
          </p>
        </div>

        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(`mrp.operationGuide.chapters.${chapter.key}.noticeTitle`)}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(`mrp.operationGuide.chapters.${chapter.key}.noticeDescription`)}
          </p>
        </section>

        {chapter.key === 'calculation' && (
          <PartRequirementsOperationGuideUsageExample />
        )}
        {chapter.key === 'supply' && (
          <PartRequirementsOperationGuideSupplyFormulas />
        )}

        <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
          {chapter.topics.map((topic) => (
            <div key={topic} className='space-y-2 py-4'>
              <dt className='text-sm leading-6 font-semibold'>
                {t(`mrp.operationGuide.topics.${topic}.title`)}
              </dt>
              <dd className='text-sm leading-7 text-muted-foreground'>
                {t(`mrp.operationGuide.topics.${topic}.description`)}
              </dd>
            </div>
          ))}
        </dl>
      </article>

      {accessibleReferenceKeys.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('mrp.operationGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('mrp.operationGuide.referenceDescription')}
          </p>
          <ul className='space-y-2'>
            {accessibleReferenceKeys.map((key) => (
              <li key={key}>
                <Link
                  {...(key === 'materials'
                    ? {
                        to: '/materials/$category',
                        params: { category: 'all' },
                      }
                    : {
                        to: partRequirementsOperationGuideReferencePages[key],
                      })}
                  className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(`mrp.operationGuide.references.${key}`)}
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

function PartRequirementsOperationGuideUsageExample() {
  const { t } = useLanguage()
  return (
    <section className='min-w-0 space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 dark:border-sky-900 dark:bg-sky-950/20'>
      <h3 className='text-sm font-semibold'>
        {t('mrp.operationGuide.example.title')}
      </h3>
      <p className='text-sm leading-7 text-muted-foreground'>
        {t('mrp.operationGuide.example.assumption')}
      </p>
      <table className='w-full table-fixed border-collapse text-left text-xs leading-6 sm:text-sm'>
        <thead>
          <tr className='border-b border-sky-200 dark:border-sky-900'>
            <th scope='col' className='w-1/3 py-2 pr-3 font-semibold'>
              {t('mrp.operationGuide.example.headers.step')}
            </th>
            <th scope='col' className='py-2 font-semibold'>
              {t('mrp.operationGuide.example.headers.calculation')}
            </th>
          </tr>
        </thead>
        <tbody>
          {(['standard', 'firstOrder', 'secondOrder', 'combined'] as const).map(
            (row) => (
              <tr
                key={row}
                className='border-b border-sky-200/60 last:border-b-0 dark:border-sky-900/60'
              >
                <th scope='row' className='py-3 pr-3 align-top font-medium'>
                  {t(`mrp.operationGuide.example.rows.${row}.label`)}
                </th>
                <td className='py-3 align-top wrap-break-word tabular-nums'>
                  {t(`mrp.operationGuide.example.rows.${row}.value`)}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
      <p className='text-sm leading-7 text-muted-foreground'>
        {t('mrp.operationGuide.example.conclusion')}
      </p>
    </section>
  )
}

function PartRequirementsOperationGuideSupplyFormulas() {
  const { t } = useLanguage()
  return (
    <section className='space-y-3 rounded-xl border border-sky-200 bg-sky-50/45 p-4 dark:border-sky-900 dark:bg-sky-950/20'>
      <h3 className='text-sm font-semibold'>
        {t('mrp.operationGuide.supplyFormula.title')}
      </h3>
      <ol className='space-y-2 text-sm leading-7'>
        {(['usable', 'total', 'gap'] as const).map((formula) => (
          <li key={formula} className='rounded-lg bg-background/80 px-3 py-2'>
            {t(`mrp.operationGuide.supplyFormula.${formula}`)}
          </li>
        ))}
      </ol>
      <p className='text-xs leading-6 text-muted-foreground'>
        {t('mrp.operationGuide.supplyFormula.theoretical')}
      </p>
      <p className='text-sm leading-7'>
        {t('mrp.operationGuide.supplyFormula.example')}
      </p>
    </section>
  )
}
