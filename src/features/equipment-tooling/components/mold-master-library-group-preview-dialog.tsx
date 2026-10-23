import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createMoldMasterLibrarySelectionOptionsQueryOptions } from '../queries/mold-master-library-query-options'

export function MoldMasterLibraryGroupPreviewDialog({
  groupName,
  onClose,
}: {
  groupName: string
  onClose: () => void
}) {
  const { locale, t } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const moldsQuery = useQuery(
    createMoldMasterLibrarySelectionOptionsQueryOptions()
  )
  const members = (moldsQuery.data ?? []).filter(
    (mold) => mold.groupName?.trim() === groupName
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className='mold-master-library-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl'>
        <DialogHeader className='shrink-0 border-b px-6 py-4 pr-12 text-start'>
          <DialogTitle className='text-base break-words'>
            {groupName}
          </DialogTitle>
          <DialogDescription className='text-xs leading-5'>
            {isChineseLocale
              ? '来源：设备工装 → 模具管理。产品关联整个分组，组内每条记录代表一副具体模具。'
              : 'Source: Equipment & Tooling → Molds. Products link to the group; each member is an individual mold.'}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-5'>
          {moldsQuery.isPending ? (
            <p role='status' className='text-sm'>
              {isChineseLocale ? '正在读取模具主库…' : 'Loading mold library…'}
            </p>
          ) : moldsQuery.isError ? (
            <div role='alert' className='space-y-3 text-sm'>
              <p>
                {isChineseLocale
                  ? '模具主库读取失败，请重试。'
                  : 'Cannot read the mold library. Please retry.'}
              </p>
              <Button
                type='button'
                variant='outline'
                className='rounded-full'
                onClick={() => void moldsQuery.refetch()}
              >
                {isChineseLocale ? '重新读取' : 'Retry'}
              </Button>
            </div>
          ) : members.length ? (
            <>
              <p className='text-xs text-muted-foreground'>
                {isChineseLocale
                  ? `共 ${members.length} 副模具`
                  : `${members.length} molds`}
              </p>
              <ul className='space-y-3'>
                {members.map((mold) => (
                  <li key={mold.id} className='space-y-3 rounded-xl border p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <p className='min-w-0 text-sm font-semibold break-words'>
                        {mold.name}
                      </p>
                      <span className='rounded-full bg-muted px-3 py-1 text-xs'>
                        {t(
                          `equipmentTooling.molds.status.${({ IDLE: 'idle', IN_USE: 'inUse', CHECKING: 'checking', MAINTENANCE: 'maintenance', RETIRED: 'retired', LENT_OUT: 'lentOut', BORROWED: 'borrowed' } as const)[mold.status]}`
                        )}
                      </span>
                    </div>
                    <dl className='grid grid-cols-1 gap-3 text-xs leading-5 sm:grid-cols-3'>
                      <div>
                        <dt className='text-muted-foreground'>
                          {isChineseLocale ? '模具编号' : 'Mold SN'}
                        </dt>
                        <dd className='break-all'>{mold.sn}</dd>
                      </div>
                      <div>
                        <dt className='text-muted-foreground'>
                          {isChineseLocale ? '存放位置' : 'Location'}
                        </dt>
                        <dd className='break-words'>{mold.location || '—'}</dd>
                      </div>
                      <div>
                        <dt className='text-muted-foreground'>
                          {isChineseLocale
                            ? '当前次数 / 寿命上限'
                            : 'Current / maximum cycles'}
                        </dt>
                        <dd>
                          {mold.currentCycles} / {mold.maxCycles}
                        </dd>
                      </div>
                      {mold.description && (
                        <div className='sm:col-span-3'>
                          <dt className='text-muted-foreground'>
                            {isChineseLocale ? '说明' : 'Description'}
                          </dt>
                          <dd className='break-words whitespace-pre-wrap'>
                            {mold.description}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p role='status' className='text-sm text-muted-foreground'>
              {isChineseLocale
                ? '此分组已没有模具，请刷新并重新选择分组。'
                : 'This group no longer contains molds. Refresh and choose another group.'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
