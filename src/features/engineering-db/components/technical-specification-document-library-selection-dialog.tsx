import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { TechnicalSpec } from '../data/schema'
import {
  useTechnicalSpecificationDocumentWriteActions,
  type TechnicalSpecificationDocumentSaveParameters,
} from '../hooks/use-technical-specification-document-write-actions'
import { createTechnicalSpecificationDocumentMasterLibraryListQueryOptions } from '../queries/technical-specification-document-master-library-query-options'
import { SpecsService } from '../services/specs-service'
import { getTechnicalSpecificationDocumentCategoryLabel } from '../view-helpers'
import { SpecActionDialog } from './spec-action-dialog'
import { TechnicalSpecificationDocumentPreviewDialog } from './technical-specification-document-preview-dialog'

export function TechnicalSpecificationDocumentLibrarySelectionDialog({
  value,
  onSelect,
  onClose,
}: {
  value?: string
  onSelect: (specification: TechnicalSpec) => void
  onClose: () => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const createPermission = usePermissionBoundary('perm_manage')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(value ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [isConfirmingSelection, setIsConfirmingSelection] = useState(false)
  const documentsQuery = useQuery(
    createTechnicalSpecificationDocumentMasterLibraryListQueryOptions()
  )
  const {
    saveTechnicalSpecificationDocument,
    isSavingTechnicalSpecificationDocument,
  } = useTechnicalSpecificationDocumentWriteActions()
  const documents = documentsQuery.data
  const matchingDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return (documents ?? []).filter(
      (item) =>
        !normalizedSearch ||
        [
          item.name,
          item.code,
          item.category,
          getTechnicalSpecificationDocumentCategoryLabel(item.category, locale),
          item.revisionNo,
          item.description,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch))
    )
  }, [documents, search, locale])
  const selectedDocument = documents?.find((item) => item.id === selectedId)
  async function saveNewTechnicalSpecificationDocumentToMasterLibrary(
    parameters: TechnicalSpecificationDocumentSaveParameters
  ) {
    const saved = await saveTechnicalSpecificationDocument(parameters)
    setSelectedId(saved.id)
    setSearch('')
    setIsCreating(false)
    toast.success(
      isChineseLocale
        ? '已保存到技术规范主库，请确认选用。'
        : 'Saved to the specification master library. Confirm to use it.'
    )
  }
  async function confirmTechnicalSpecificationDocumentFromMasterLibrary() {
    if (!selectedDocument || isConfirmingSelection) return
    setIsConfirmingSelection(true)
    try {
      const currentDocument = await SpecsService.getSpec(selectedDocument.id)
      onSelect(currentDocument)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '文档读取失败')
      void documentsQuery.refetch()
    } finally {
      setIsConfirmingSelection(false)
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !isConfirmingSelection) onClose()
        }}
      >
        <DialogContent className='engineering-technical-specification-document-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl'>
          <DialogHeader className='shrink-0 border-b px-6 py-4 pr-12 text-start'>
            <DialogTitle className='text-base'>
              {isChineseLocale
                ? '从技术规范主库选择工艺文档'
                : 'Choose a process document from the specification library'}
            </DialogTitle>
            <DialogDescription className='text-xs leading-5'>
              {isChineseLocale
                ? '文档统一归工程管理 → 技术规范主库维护。此处选用已有文档，也可以新增入库后再选用；产品关联随产品保存。'
                : 'Documents belong to Engineering Management → Technical Specifications. Select an existing document or create one in that library. The product link is saved with the product.'}
            </DialogDescription>
          </DialogHeader>
          <div className='flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-3'>
            <div className='relative min-w-0 flex-1'>
              <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                aria-label={
                  isChineseLocale
                    ? '搜索主库工艺规范'
                    : 'Search master specifications'
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isChineseLocale
                    ? '搜索名称、编码、分类或修订版本'
                    : 'Search name, code, category or revision'
                }
                className='h-10 pl-9 text-[13px] placeholder:text-[13px] placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case placeholder:opacity-100 md:text-[13px]'
              />
            </div>
            <Button
              type='button'
              variant='outline'
              className='rounded-full text-[13px]'
              disabled={documentsQuery.isFetching}
              onClick={() => void documentsQuery.refetch()}
            >
              {isChineseLocale ? '刷新主库' : 'Refresh library'}
            </Button>
            <Button
              type='button'
              className='rounded-full bg-blue-600 text-[13px] text-white hover:bg-blue-700'
              disabled={!createPermission.isAllowed}
              title={
                !createPermission.isAllowed
                  ? isChineseLocale
                    ? '新增主库文档需要管理权限'
                    : 'Management permission is required'
                  : undefined
              }
              onClick={() => setIsCreating(true)}
            >
              <Plus className='mr-1 size-4' />
              {isChineseLocale ? '新增主库文档' : 'New master document'}
            </Button>
          </div>
          <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-5'>
            {documentsQuery.isPending ? (
              <p role='status' className='text-sm'>
                {isChineseLocale
                  ? '正在读取技术规范主库…'
                  : 'Loading specification library…'}
              </p>
            ) : documentsQuery.isError ? (
              <p role='alert' className='text-sm text-destructive'>
                {isChineseLocale
                  ? '主库读取失败，请点击“刷新主库”重试。'
                  : 'Cannot read the library. Select Refresh library to retry.'}
              </p>
            ) : matchingDocuments.length ? (
              <ul className='space-y-2'>
                {matchingDocuments.map((specification) => (
                  <li
                    key={specification.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3',
                      selectedId === specification.id
                        ? 'border-blue-500 bg-blue-600/5'
                        : 'border-border'
                    )}
                  >
                    <label className='flex min-w-0 flex-1 cursor-pointer items-start gap-3'>
                      <input
                        type='radio'
                        name='technical-specification-master-document'
                        value={specification.id}
                        checked={selectedId === specification.id}
                        onChange={() => setSelectedId(specification.id)}
                        className='mt-1 size-4 shrink-0 accent-blue-600'
                      />
                      <span className='min-w-0'>
                        <span className='block text-sm font-semibold break-words'>
                          {specification.name}
                        </span>
                        <span className='mt-1 block text-xs leading-5 break-all text-muted-foreground'>
                          {[
                            specification.code,
                            getTechnicalSpecificationDocumentCategoryLabel(
                              specification.category,
                              locale
                            ),
                            specification.revisionNo,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {specification.description && (
                          <span className='mt-1 block text-xs leading-5 break-words text-muted-foreground'>
                            {specification.description}
                          </span>
                        )}
                      </span>
                    </label>
                    <Button
                      type='button'
                      variant='outline'
                      className='shrink-0 rounded-full text-xs'
                      onClick={() => setPreviewId(specification.id)}
                    >
                      <Eye className='mr-1 size-4' />
                      {isChineseLocale ? '查看' : 'View'}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p role='status' className='text-sm text-muted-foreground'>
                {documents?.length
                  ? isChineseLocale
                    ? '没有匹配的工艺规范，请调整搜索内容。'
                    : 'No matching specifications. Try another search.'
                  : isChineseLocale
                    ? '主库尚无工艺规范文档，可通过“新增主库文档”建立。'
                    : 'The master library has no specifications. Use New master document to create one.'}
              </p>
            )}
          </div>
          <DialogFooter className='shrink-0 border-t px-5 py-4'>
            <p className='mr-auto text-start text-xs leading-5 text-muted-foreground'>
              {selectedDocument
                ? isChineseLocale
                  ? `已选：${selectedDocument.name}`
                  : `Selected: ${selectedDocument.name}`
                : isChineseLocale
                  ? '请选择一份主库文档'
                  : 'Select a master document'}
            </p>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={isConfirmingSelection}
              onClick={onClose}
            >
              {isChineseLocale ? '取消' : 'Cancel'}
            </Button>
            <Button
              type='button'
              className='rounded-full bg-blue-600 text-white hover:bg-blue-700'
              disabled={
                !selectedDocument ||
                !documentsQuery.isSuccess ||
                isConfirmingSelection
              }
              onClick={() =>
                void confirmTechnicalSpecificationDocumentFromMasterLibrary()
              }
            >
              {isConfirmingSelection
                ? isChineseLocale
                  ? '正在核对…'
                  : 'Checking…'
                : isChineseLocale
                  ? '确认选用此文档'
                  : 'Use this document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isCreating && (
        <SpecActionDialog
          open
          onOpenChange={setIsCreating}
          onSave={saveNewTechnicalSpecificationDocumentToMasterLibrary}
          isLoading={isSavingTechnicalSpecificationDocument}
        />
      )}
      {previewId && (
        <TechnicalSpecificationDocumentPreviewDialog
          specificationId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </>
  )
}
