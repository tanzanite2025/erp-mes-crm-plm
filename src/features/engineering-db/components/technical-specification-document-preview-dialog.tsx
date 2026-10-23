import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createTechnicalSpecificationDocumentMasterLibraryDetailQueryOptions } from '../queries/technical-specification-document-master-library-query-options'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'
import { FileResolverService } from '../services/file-resolver-service'
import { getTechnicalSpecificationDocumentCategoryLabel } from '../view-helpers'
import { ExcelViewer } from './excel-viewer'
import { PDFViewer } from './pdf-viewer'

export function TechnicalSpecificationDocumentPreviewDialog({
  specificationId,
  onClose,
}: {
  specificationId: string
  onClose: () => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const documentQuery = useQuery(
    createTechnicalSpecificationDocumentMasterLibraryDetailQueryOptions(
      specificationId
    )
  )
  const specification = documentQuery.data
  const sourceQuery = useQuery({
    queryKey: [
      ...ENGINEERING_DB_SPECS_QUERY_KEY,
      'source-url',
      specification?.fileUrl ?? '',
    ],
    queryFn: () => FileResolverService.resolveFileUrl(specification?.fileUrl),
    enabled: Boolean(specification?.fileUrl),
  })
  const extension = specification?.fileExtension
    ?.toLowerCase()
    .replace(/^\./, '')
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className='engineering-technical-specification-document-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[90vw]'>
        <DialogHeader className='shrink-0 border-b px-6 py-4 pr-12 text-start'>
          <DialogTitle className='text-base'>
            {specification?.name ||
              (isChineseLocale
                ? '查看工艺规范文档'
                : 'View process specification')}
          </DialogTitle>
          <DialogDescription className='text-xs leading-5'>
            {isChineseLocale
              ? '来源：工程管理 → 技术规范主库。'
              : 'Source: Engineering Management → Technical Specifications.'}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-5'>
          {documentQuery.isPending ? (
            <p role='status' className='text-sm'>
              {isChineseLocale
                ? '正在读取主库文档…'
                : 'Loading the master document…'}
            </p>
          ) : documentQuery.isError ? (
            <div role='alert' className='space-y-3 text-sm'>
              <p>
                {isChineseLocale
                  ? '主库文档读取失败，可能已删除或暂时无法访问。'
                  : 'Cannot read this document. It may have been deleted or be temporarily unavailable.'}
              </p>
              <Button
                type='button'
                variant='outline'
                className='rounded-full'
                onClick={() => void documentQuery.refetch()}
              >
                {isChineseLocale ? '重新读取' : 'Retry'}
              </Button>
            </div>
          ) : specification ? (
            <>
              <dl className='grid grid-cols-1 gap-3 rounded-xl border bg-muted/20 p-4 text-xs leading-5 sm:grid-cols-3'>
                <div className='min-w-0'>
                  <dt className='text-muted-foreground'>
                    {isChineseLocale ? '文档编码' : 'Document code'}
                  </dt>
                  <dd className='break-all'>{specification.code}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>
                    {isChineseLocale ? '文档分类' : 'Category'}
                  </dt>
                  <dd>
                    {getTechnicalSpecificationDocumentCategoryLabel(
                      specification.category,
                      locale
                    )}
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>
                    {isChineseLocale ? '修订版本' : 'Revision'}
                  </dt>
                  <dd>{specification.revisionNo || '—'}</dd>
                </div>
                {specification.description && (
                  <div className='sm:col-span-3'>
                    <dt className='text-muted-foreground'>
                      {isChineseLocale ? '文档说明' : 'Description'}
                    </dt>
                    <dd className='whitespace-pre-wrap'>
                      {specification.description}
                    </dd>
                  </div>
                )}
              </dl>
              {!specification.fileUrl ? (
                <p className='text-sm text-muted-foreground'>
                  {isChineseLocale
                    ? '此文档尚未上传附件，可以查看以上主库信息。'
                    : 'This document has no attachment. Its master information is shown above.'}
                </p>
              ) : sourceQuery.isPending ? (
                <p className='text-sm'>
                  {isChineseLocale ? '正在读取附件…' : 'Loading attachment…'}
                </p>
              ) : !sourceQuery.data ? (
                <p role='alert' className='text-sm text-destructive'>
                  {isChineseLocale
                    ? '附件地址无效，请在主库编辑文档并重新上传到服务器。'
                    : 'The attachment URL is invalid. Re-upload it to the server from the master library.'}
                </p>
              ) : (
                <>
                  <Button
                    asChild
                    variant='outline'
                    className='rounded-full text-[13px]'
                  >
                    <a
                      href={sourceQuery.data}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <Download className='mr-2 size-4' />
                      {isChineseLocale
                        ? '打开或下载原始文档'
                        : 'Open or download source document'}
                    </a>
                  </Button>
                  {extension === 'pdf' ? (
                    <div className='h-[55vh] min-h-[240px]'>
                      <PDFViewer fileUrl={sourceQuery.data} />
                    </div>
                  ) : extension === 'xlsx' ? (
                    <div className='h-[55vh] min-h-[240px]'>
                      <ExcelViewer
                        fileUrl={sourceQuery.data}
                        credentials={
                          specification.fileUrl.startsWith('/uploads/')
                            ? 'include'
                            : 'same-origin'
                        }
                      />
                    </div>
                  ) : (
                    <p className='text-xs leading-5 text-muted-foreground'>
                      {isChineseLocale
                        ? '此格式请下载后使用对应的软件查看。'
                        : 'Download this format and open it with the appropriate application.'}
                    </p>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
