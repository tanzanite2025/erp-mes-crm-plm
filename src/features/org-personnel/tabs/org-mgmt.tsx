'use client'

import { useState } from 'react'
import {
  Briefcase,
  Edit,
  GitCommit,
  Info,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Warehouse,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'
import { OrgActionDialog } from '../components/org-action-dialog'
import { OrgTree } from '../components/org-tree'
import { ProductionSelector } from '../components/production-selector'
import { type OrgNode } from '../data/org-schema'
import { useOrgMgmt } from '../hooks/use-org-mgmt'

export function OrgMgmt() {
  const { locale, t } = useLanguage()
  const {
    orgData,
    selectedNode,
    setSelectedNode,
    error,
    isLoading,
    loadError,
    loadData,
    handleOrgSubmit,
    handleDelete,
    handleLinkSave,
  } = useOrgMgmt()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const retryText = locale === 'zh-CN' ? '重新加载' : 'Retry'
  const failedText = locale === 'zh-CN' ? '失败' : 'Failed'
  const loadingText = locale === 'zh-CN' ? '加载中' : 'Loading'
  const cancelText = locale === 'zh-CN' ? '取消' : 'Cancel'
  const confirmDeleteText = locale === 'zh-CN' ? '确认删除' : 'Confirm Delete'
  const showLoadingState = isLoading && orgData.length === 0
  const canCreateChild = selectedNode?.type !== 'team'
  const addChildHint =
    locale === 'zh-CN'
      ? '三级生产单元为末级，不允许继续新增下级。'
      : 'Third-level production units are terminal and cannot have children.'

  const getOrgLevelBadge = (type: OrgNode['type']) => {
    if (locale !== 'zh-CN') {
      if (type === 'company') return 'Level 1'
      if (type === 'department') return 'Level 2'
      return 'Level 3'
    }

    if (type === 'company') return '一级单位'
    if (type === 'department') return '二级部门'
    return '三级生产单元'
  }

  const { level1Name } = useHierarchyLevelLabels()

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 p-1 duration-700 fade-in md:p-2'>
      <IndustrialHeader
        icon={Users}
        title={t('orgPersonnel.org.title')}
        description={t('orgPersonnel.org.subtitle')}
        gradient
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-blue-500/10 bg-blue-500/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-blue-600/60 uppercase'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-emerald-500' />
          </div>
        }
      />

      {loadError && (
        <div className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50/80 px-5 py-4 text-amber-900 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black tracking-widest uppercase'>
                {failedText}
              </p>
              <p className='text-sm leading-relaxed font-bold'>{loadError}</p>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='h-8 rounded-full border-dashed bg-background/80'
              onClick={() => void loadData()}
            >
              <RefreshCw className='mr-2 size-3.5' /> {retryText}
            </Button>
          </div>
        </div>
      )}

      <div className='flex min-h-[600px] flex-1 flex-col gap-6 overflow-hidden md:flex-row'>
        <Card className='flex w-full shrink-0 flex-col overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner md:w-[320px]'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 border-b border-dashed border-muted/50 px-6 py-4'>
            <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
              {t('orgPersonnel.org.treeTitle')}
            </CardTitle>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 rounded-full hover:bg-background'
              onClick={() => {
                setDialogMode('add')
                setSelectedNode(null)
                setDialogOpen(true)
              }}
            >
              <Plus className='size-4' />
            </Button>
          </CardHeader>
          <CardContent className='flex-1 overflow-hidden p-2'>
            {showLoadingState ? (
              <div className='flex h-full min-h-[240px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-muted/50 bg-background/50 text-center'>
                <Loader2 className='size-8 animate-spin opacity-60' />
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {loadingText}
                </p>
              </div>
            ) : orgData.length > 0 ? (
              <ScrollArea className='h-full px-2'>
                <OrgTree
                  data={orgData}
                  selectedId={selectedNode?.id}
                  onSelect={setSelectedNode}
                />
              </ScrollArea>
            ) : (
              <div className='flex h-full flex-col items-center justify-center text-muted-foreground/30'>
                <Info className='mb-2 size-8 opacity-20' />
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {t('orgPersonnel.org.selectHint')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className='flex min-w-0 flex-1 flex-col gap-6 overflow-hidden'>
          {showLoadingState ? (
            <div className='flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5'>
              <Loader2 className='size-8 animate-spin opacity-20' />
            </div>
          ) : selectedNode ? (
            <>
              <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
                <CardHeader className='flex flex-col gap-4 border-b border-dashed border-muted/50 px-8 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-2'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <CardTitle className='text-lg font-black tracking-tighter text-slate-800 uppercase italic'>
                        {selectedNode.name}
                      </CardTitle>
                      <Badge
                        variant='outline'
                        className='h-5 rounded-full border-none bg-blue-600/10 px-3 text-[9px] font-black text-blue-600 uppercase italic'
                      >
                        {getOrgLevelBadge(selectedNode.type)}
                      </Badge>
                    </div>
                    <CardDescription className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-40'>
                      <Info className='size-3' /> ID: {selectedNode.id}
                    </CardDescription>
                  </div>
                  <div className='flex shrink-0 flex-wrap gap-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-9 rounded-full border border-dashed border-muted-foreground/20 px-5 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-background'
                      onClick={() => {
                        setDialogMode('edit')
                        setDialogOpen(true)
                      }}
                    >
                      <Edit className='mr-2 size-3.5' />{' '}
                      {t('orgPersonnel.org.editData')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-9 rounded-full border border-dashed border-muted-foreground/20 px-5 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-background'
                      onClick={() => {
                        setDialogMode('add')
                        setDialogOpen(true)
                      }}
                      disabled={!canCreateChild}
                      title={!canCreateChild ? addChildHint : undefined}
                    >
                      <Plus className='mr-2 size-4' />{' '}
                      {t('orgPersonnel.org.addChild')}
                    </Button>
                    {selectedNode.parentId !== undefined && (
                      <Button
                        variant='destructive'
                        size='sm'
                        className='h-9 rounded-full border-none px-5 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-rose-500/10'
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <Trash2 className='mr-2 size-4' />{' '}
                        {t('orgPersonnel.org.removeItem')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className='grid grid-cols-1 gap-8 px-8 pt-8 pb-8 xl:grid-cols-2'>
                  <div className='flex items-start gap-4 rounded-2xl border border-dashed border-muted/50 bg-background/50 p-4'>
                    <div className='mt-1 rounded-full bg-primary/10 p-2'>
                      <Users className='size-4 text-primary' />
                    </div>
                    <div>
                      <p className='mb-1 text-[10px] font-black tracking-widest uppercase opacity-40'>
                        {t('orgPersonnel.org.manager')}
                      </p>
                      <p className='text-sm font-black text-slate-700 italic'>
                        {selectedNode.manager || t('orgPersonnel.org.none')}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start gap-4 rounded-2xl border border-dashed border-muted/50 bg-background/50 p-4'>
                    <div className='mt-1 rounded-full bg-primary/10 p-2'>
                      <Briefcase className='size-4 text-primary' />
                    </div>
                    <div>
                      <p className='mb-1 text-[10px] font-black tracking-widest uppercase opacity-40'>
                        {t('orgPersonnel.org.units')}
                      </p>
                      <p className='text-sm font-black text-slate-700 italic'>
                        {selectedNode.children?.length || 0}{' '}
                        {t('orgPersonnel.org.connected')}
                      </p>
                    </div>
                  </div>
                  <div className='col-span-1 space-y-3 xl:col-span-2'>
                    <p className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-40'>
                      {t('orgPersonnel.org.functions')}
                    </p>
                    <div className='min-h-[100px] rounded-2xl border border-dashed border-muted/50 bg-background px-6 py-5 text-sm leading-relaxed font-medium text-slate-600 shadow-inner'>
                      {selectedNode.description ||
                        t('orgPersonnel.org.noDescription')}
                    </div>
                    {!canCreateChild && (
                      <div className='rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-bold text-amber-800'>
                        {addChildHint}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className='grid grid-cols-1 gap-6 overflow-hidden md:grid-cols-2'>
                <Card className='flex flex-col overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
                  <CardHeader className='flex shrink-0 flex-row items-center justify-between border-b border-dashed border-muted/50 px-6 py-4'>
                    <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                      {t('orgPersonnel.org.childrenTitle')} (
                      {selectedNode.children?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='flex-1 overflow-hidden p-0'>
                    <ScrollArea className='h-[300px]'>
                      {selectedNode.children &&
                      selectedNode.children.length > 0 ? (
                        <div className='divide-y divide-dashed divide-muted/50'>
                          {selectedNode.children.map((child: OrgNode) => (
                            <div
                              key={child.id}
                              className='flex items-center justify-between px-6 py-5 transition-colors hover:bg-background'
                            >
                              <div className='flex items-center gap-4'>
                                <div className='flex size-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/10 bg-muted'>
                                  <Warehouse className='size-4 text-muted-foreground/60' />
                                </div>
                                <div>
                                  <p className='text-sm font-black text-slate-700 italic'>
                                    {child.name}
                                  </p>
                                  <p className='text-[10px] font-black tracking-widest uppercase opacity-40'>
                                    {getOrgLevelBadge(child.type)}
                                    {child.manager ? ` / ${child.manager}` : ''}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 rounded-full border border-dashed border-muted-foreground/10 px-4 text-[10px] font-black uppercase hover:bg-background'
                                onClick={() => setSelectedNode(child)}
                              >
                                {t('orgPersonnel.org.manageDetail')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='flex h-full flex-col items-center justify-center p-8 text-muted-foreground/20'>
                          <Info className='mb-2 size-8 opacity-20' />
                          <p className='text-[10px] font-black tracking-widest uppercase'>
                            {t('orgPersonnel.org.noChildren')}
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className='flex flex-col overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
                  <CardHeader className='flex shrink-0 flex-row items-center justify-between border-b border-dashed border-muted/50 px-6 py-4'>
                    <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                      {t('orgPersonnel.org.linkedTitle')} (
                      {selectedNode.linkedArchitecture?.length || 0})
                    </CardTitle>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 rounded-full border border-dashed border-muted-foreground/20 px-4 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-background'
                      onClick={() => setSelectorOpen(true)}
                    >
                      {t('orgPersonnel.org.manageLinks')}
                    </Button>
                  </CardHeader>
                  <CardContent className='flex-1 overflow-hidden p-0'>
                    <ScrollArea className='h-[300px]'>
                      {selectedNode.linkedArchitecture &&
                      selectedNode.linkedArchitecture.length > 0 ? (
                        <div className='divide-y divide-dashed divide-muted/50'>
                          {selectedNode.linkedArchitecture.map(
                            (
                              item: NonNullable<
                                OrgNode['linkedArchitecture']
                              >[number]
                            ) => (
                              <div
                                key={item.id}
                                className='flex items-center justify-between px-6 py-5 transition-colors hover:bg-background'
                              >
                                <div className='flex items-center gap-4'>
                                  <div
                                    className={cn(
                                      'flex size-10 items-center justify-center rounded-full border border-dashed border-muted-foreground/10',
                                      item.type === 'line'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-slate-50 text-slate-600'
                                    )}
                                  >
                                    {item.type === 'line' ? (
                                      <LayoutGrid className='size-4' />
                                    ) : (
                                      <GitCommit className='size-4' />
                                    )}
                                  </div>
                                  <div>
                                    <p className='text-sm font-black text-slate-700 italic'>
                                      {item.name}
                                    </p>
                                    <p className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                                      {item.type === 'line'
                                        ? t(
                                            'orgPersonnel.org.types.productionLine'
                                          )
                                        : t(
                                            'orgPersonnel.org.types.workshopLevel',
                                            { levelName: level1Name }
                                          )}
                                    </p>
                                  </div>
                                </div>
                                <Badge className='h-5 rounded-full border-none bg-emerald-500/10 px-2 text-[8px] font-black text-emerald-600 uppercase'>
                                  {t('orgPersonnel.org.connected')}
                                </Badge>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className='flex h-full flex-col items-center justify-center p-8 text-muted-foreground/20'>
                          <LayoutGrid className='mb-2 size-8 opacity-20' />
                          <p className='text-[10px] font-black tracking-widest uppercase'>
                            {t('orgPersonnel.org.noLinked')}
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className='flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5 text-muted-foreground/40'>
              <div className='flex flex-col items-center gap-3'>
                <Users className='size-12 opacity-10' />
                <p className='text-[11px] font-black tracking-widest uppercase'>
                  {t('orgPersonnel.org.selectHint')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <OrgActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentRow={
          dialogMode === 'edit' ? selectedNode || undefined : undefined
        }
        parentNode={
          dialogMode === 'add' ? selectedNode || undefined : undefined
        }
        onSubmit={handleOrgSubmit}
      />

      <ProductionSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        selectedItems={selectedNode?.linkedArchitecture || []}
        onSave={handleLinkSave}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        handleConfirm={async () => {
          setDeleteConfirmOpen(false)
          await handleDelete()
        }}
        title={t('orgPersonnel.org.removeItem')}
        desc={t('orgPersonnel.org.deleteConfirm', {
          name: selectedNode?.name || '',
        })}
        destructive
        cancelBtnText={cancelText}
        confirmText={confirmDeleteText}
      />
    </div>
  )
}
