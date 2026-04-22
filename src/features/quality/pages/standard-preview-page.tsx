import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, SquarePen, Telescope } from 'lucide-react'
import { isForbiddenError, isNotFoundError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { PageHeader } from '@/components/layout/page-header'
import { StandardPreviewContent } from '../components/standard-preview-content'
import { useGetQualityStandard } from '../hooks/use-quality'

interface StandardPreviewPageProps {
  standardId: string
}

export function StandardPreviewPage({ standardId }: StandardPreviewPageProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { data: standard, isLoading, error } = useGetQualityStandard(standardId)

  const handleBack = () => {
    navigate({ to: '/quality/standards' })
  }

  const handleOpenEditor = () => {
    navigate({
      to: '/quality/standards/$standardId/edit',
      params: { standardId },
    })
  }

  const title = t('quality.standards.workspace.previewTitle')
  const description = t('quality.standards.workspace.previewDescription')

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <PageHeader icon={Telescope} title={title} description={description} />
        <div className='flex min-h-[60vh] items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5'>
          <div className='flex flex-col items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
              {t('common.actions.loading')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !standard) {
    const isMissing = isNotFoundError(error) || !standard
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Button
            variant='outline'
            className='rounded-full'
            onClick={handleBack}
          >
            <ArrowLeft className='mr-2 size-4' />
            {t('quality.standards.workspace.backToList')}
          </Button>
        </div>

        <PageHeader icon={Telescope} title={title} description={description} />

        <Card className='rounded-[32px] border-dashed border-muted/50 bg-muted/5'>
          <CardHeader>
            <CardTitle>
              {isMissing
                ? t('quality.standards.workspace.previewMissingTitle')
                : t('quality.standards.workspace.previewLoadFailedTitle')}
            </CardTitle>
            <CardDescription>
              {isMissing
                ? t('quality.standards.workspace.previewMissingDescription')
                : t('quality.standards.workspace.previewLoadFailedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={handleBack}
            >
              <ArrowLeft className='mr-2 size-4' />
              {t('quality.standards.workspace.backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button variant='outline' className='rounded-full' onClick={handleBack}>
          <ArrowLeft className='mr-2 size-4' />
          {t('quality.standards.workspace.backToList')}
        </Button>
        <Button className='rounded-full' onClick={handleOpenEditor}>
          <SquarePen className='mr-2 size-4' />
          {t('quality.standards.workspace.openEditor')}
        </Button>
      </div>

      <PageHeader icon={Telescope} title={title} description={description} />

      <div className='group relative flex min-h-[70vh] flex-col overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-background shadow-sm'>
        <StandardPreviewContent
          standard={standard}
          onClose={handleBack}
          closeLabel={t('quality.standards.workspace.backToList')}
          primaryActionLabel={t('quality.standards.workspace.openEditor')}
          onPrimaryAction={handleOpenEditor}
        />
      </div>
    </div>
  )
}

export function StandardPreviewRoutePage() {
  const { standardId } = useParams({
    from: '/_authenticated/quality/standards/$standardId/preview',
  })

  return <StandardPreviewPage standardId={standardId} />
}
