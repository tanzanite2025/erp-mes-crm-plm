import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, Info } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  type OrganizationAndAccountOperationGuideChapter,
  organizationAndAccountOperationGuideConceptKeys,
  organizationAndAccountOperationGuideReferencePages,
} from '../data/organization-and-account-operation-guide-chapter-definitions'
import { PersonnelRecordCreationLauncher } from './personnel-record-creation-launcher'

export function OrganizationAndAccountOperationGuideChapterExplanations({
  chapter,
}: {
  chapter: OrganizationAndAccountOperationGuideChapter
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const accessibleReferenceKeys = chapter.referenceKeys.filter((key) =>
    matchesPathPermissionProjection(
      user,
      organizationAndAccountOperationGuideReferencePages[key]
    )
  )

  return (
    <div className='grid min-w-0 items-start gap-5 @5xl:grid-cols-[minmax(0,1fr)_17rem]'>
      <article className='min-w-0 space-y-4'>
        <div className='space-y-2'>
          <h2 className='text-base leading-7 font-semibold'>
            {t(`orgPersonnel.operationGuide.chapters.${chapter.key}.title`)}
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `orgPersonnel.operationGuide.chapters.${chapter.key}.description`
            )}
          </p>
          {chapter.key === 'organization' && (
            <PersonnelRecordCreationLauncher recordType='organization' />
          )}
          {chapter.key === 'employees' && (
            <PersonnelRecordCreationLauncher recordType='employee' />
          )}
          {chapter.key === 'accounts' && (
            <PersonnelRecordCreationLauncher recordType='account' />
          )}
        </div>
        <section className='space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/35'>
          <h3 className='flex items-start gap-2 text-sm leading-6 font-semibold text-amber-950 dark:text-amber-100'>
            <Info aria-hidden='true' className='mt-1 size-4 shrink-0' />
            {t(
              `orgPersonnel.operationGuide.chapters.${chapter.key}.noticeTitle`
            )}
          </h3>
          <p className='text-sm leading-7 text-amber-900 dark:text-amber-200'>
            {t(
              `orgPersonnel.operationGuide.chapters.${chapter.key}.noticeDescription`
            )}
          </p>
        </section>

        {chapter.key === 'relationships' && (
          <OrganizationAndAccountOperationGuideConceptTable />
        )}

        <section aria-label={t('orgPersonnel.operationGuide.stepsLabel')}>
          <dl className='divide-y rounded-xl border bg-card px-4 sm:px-5'>
            {chapter.topics.map((topic) => (
              <div key={topic} className='space-y-2 py-4'>
                <dt className='text-sm leading-6 font-semibold'>
                  {t(`orgPersonnel.operationGuide.topics.${topic}.title`)}
                </dt>
                <dd className='text-sm leading-7 text-muted-foreground'>
                  {t(`orgPersonnel.operationGuide.topics.${topic}.description`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className='space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/25'>
          <h3 className='text-sm leading-6 font-semibold'>
            {t('orgPersonnel.operationGuide.exampleLabel')}
          </h3>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(`orgPersonnel.operationGuide.chapters.${chapter.key}.example`)}
          </p>
        </section>
        <section className='space-y-2 rounded-xl border bg-card p-4'>
          <h3 className='flex items-center gap-2 text-sm leading-6 font-semibold'>
            <CheckCircle2
              aria-hidden='true'
              className='size-4 shrink-0 text-emerald-600'
            />
            {t('orgPersonnel.operationGuide.completionLabel')}
          </h3>
          <p className='text-sm leading-7 text-muted-foreground'>
            {t(
              `orgPersonnel.operationGuide.chapters.${chapter.key}.completion`
            )}
          </p>
        </section>
      </article>

      {accessibleReferenceKeys.length > 0 && (
        <aside className='min-w-0 space-y-3 rounded-xl border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            {t('orgPersonnel.operationGuide.referenceTitle')}
          </h2>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('orgPersonnel.operationGuide.referenceDescription')}
          </p>
          <ul className='space-y-2'>
            {accessibleReferenceKeys.map((key) => (
              <li key={key}>
                <Link
                  to={organizationAndAccountOperationGuideReferencePages[key]}
                  className='flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm leading-6 text-sky-700 transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-sky-300 dark:hover:bg-sky-950/40'
                >
                  {t(`orgPersonnel.operationGuide.references.${key}`)}
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

function OrganizationAndAccountOperationGuideConceptTable() {
  const { t } = useLanguage()
  return (
    <div className='overflow-hidden rounded-xl border'>
      <table className='w-full table-fixed text-left text-xs leading-6 sm:text-sm'>
        <caption className='bg-muted/30 px-4 py-3 text-left text-sm font-semibold'>
          {t('orgPersonnel.operationGuide.concepts.caption')}
        </caption>
        <thead className='border-y bg-muted/30'>
          <tr>
            <th
              scope='col'
              className='w-[22%] px-3 py-2 font-medium sm:w-[18%]'
            >
              {t('orgPersonnel.operationGuide.concepts.nameHeader')}
            </th>
            <th scope='col' className='px-3 py-2 font-medium'>
              {t('orgPersonnel.operationGuide.concepts.purposeHeader')}
            </th>
            <th scope='col' className='px-3 py-2 font-medium'>
              {t('orgPersonnel.operationGuide.concepts.exampleHeader')}
            </th>
          </tr>
        </thead>
        <tbody className='divide-y'>
          {organizationAndAccountOperationGuideConceptKeys.map((key) => (
            <tr key={key}>
              <th
                scope='row'
                className='px-3 py-3 align-top font-medium wrap-break-word'
              >
                {t(`orgPersonnel.operationGuide.concepts.${key}.name`)}
              </th>
              <td className='px-3 py-3 align-top wrap-break-word text-muted-foreground'>
                {t(`orgPersonnel.operationGuide.concepts.${key}.purpose`)}
              </td>
              <td className='px-3 py-3 align-top wrap-break-word text-muted-foreground'>
                {t(`orgPersonnel.operationGuide.concepts.${key}.example`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
