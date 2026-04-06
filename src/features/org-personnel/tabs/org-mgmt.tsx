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
import { ForbiddenState } from '@/components/forbidden-state'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { OrgActionDialog } from '../components/org-action-dialog'
import { OrgTree } from '../components/org-tree'
import { ProductionSelector } from '../components/production-selector'
import { type OrgNode } from '../data/org-schema'
import { useOrgMgmt } from '../hooks/use-org-mgmt'
import { IndustrialHeader } from '@/components/uds/industrial-header'

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

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700 p-1 md:p-2'>
      <IndustrialHeader 
        icon={Users}
        title={t('orgPersonnel.org.title')}
        description={t('orgPersonnel.org.subtitle')}
        gradient
        statusBadge={
            <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-blue-500/5 border border-blue-500/10 w-fit'>
                <span className='text-[10px] font-black text-blue-600/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                <div className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
            </div>
        }
      />

      {loadError && (
        <div className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50/80 px-5 py-4 text-amber-900 shadow-sm'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black uppercase tracking-widest'>{failedText}</p>
              <p className='text-sm font-bold leading-relaxed'>{loadError}</p>
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

      <div className='flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-[600px]'>
        {/* 左侧组织树 */}
        <Card className='w-full md:w-[320px] flex flex-col shrink-0 overflow-hidden rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
          <CardHeader className='px-6 py-4 border-b border-dashed border-muted/50 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-black tracking-tighter italic uppercase'>
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
          <CardContent className='p-2 flex-1 overflow-hidden'>
            {showLoadingState ? (
              <div className='h-full min-h-[240px] flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-muted/50 bg-background/50 text-center'>
                <Loader2 className='size-8 animate-spin opacity-60' />
                <p className='text-[10px] font-black uppercase tracking-widest'>{loadingText}</p>
              </div>
            ) : orgData.length > 0 ? (
              <ScrollArea className='h-full px-2'>
                <OrgTree data={orgData} selectedId={selectedNode?.id} onSelect={setSelectedNode} />
              </ScrollArea>
            ) : (
              <div className='h-full flex flex-col items-center justify-center text-muted-foreground/30'>
                  <Info className='size-8 opacity-20 mb-2' />
                  <p className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.org.selectHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧节点详情 */}
        <div className='flex-1 flex flex-col gap-6 overflow-hidden min-w-0'>
          {showLoadingState ? (
            <div className='flex-1 flex items-center justify-center border border-dashed border-muted/50 rounded-[24px] bg-muted/5'>
                <Loader2 className='size-8 animate-spin opacity-20' />
            </div>
          ) : selectedNode ? (
            <>
              <Card className='rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
                <CardHeader className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-2 px-8 py-6 border-b border-dashed border-muted/50'>
                  <div className='space-y-1 min-w-0 flex-1'>
                    <div className='flex items-center gap-3 flex-wrap'>
                      <CardTitle className='text-lg font-black tracking-tighter italic text-slate-800 uppercase'>
                        {selectedNode.name}
                      </CardTitle>
                      <Badge variant='outline' className='rounded-full bg-blue-600/10 text-blue-600 border-none px-3 h-5 text-[9px] font-black uppercase italic'>
                        {selectedNode.type === 'company'
                          ? t('orgPersonnel.org.nodeTypes.root')
                          : selectedNode.type === 'department'
                            ? t('orgPersonnel.org.nodeTypes.dept')
                            : t('orgPersonnel.org.nodeTypes.team')}
                      </Badge>
                    </div>
                    <CardDescription className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40'>
                      <Info className='size-3' /> ID: {selectedNode.id}
                    </CardDescription>
                  </div>
                  <div className='flex flex-wrap gap-2 shrink-0'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-9 rounded-full border border-dashed border-muted-foreground/20 hover:bg-background transition-all font-black text-[10px] uppercase tracking-widest px-5'
                      onClick={() => { setDialogMode('edit'); setDialogOpen(true); }}
                    >
                      <Edit className='mr-2 size-3.5' /> {t('orgPersonnel.org.editData')}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-9 rounded-full border border-dashed border-muted-foreground/20 hover:bg-background transition-all font-black text-[10px] uppercase tracking-widest px-5'
                      onClick={() => { setDialogMode('add'); setDialogOpen(true); }}
                    >
                      <Plus className='mr-2 size-4' /> {t('orgPersonnel.org.addChild')}
                    </Button>
                    {selectedNode.parentId !== undefined && (
                      <Button
                        variant='destructive'
                        size='sm'
                        className='h-9 rounded-full border-none shadow-lg shadow-rose-500/10 font-black text-[10px] uppercase tracking-widest px-5'
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <Trash2 className='mr-2 size-4' /> {t('orgPersonnel.org.removeItem')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className='pt-8 pb-8 px-8 grid grid-cols-1 xl:grid-cols-2 gap-8'>
                  <div className='flex items-start gap-4 p-4 rounded-2xl bg-background/50 border border-dashed border-muted/50'>
                    <div className='mt-1 bg-primary/10 p-2 rounded-full'>
                      <Users className='size-4 text-primary' />
                    </div>
                    <div>
                      <p className='text-[10px] font-black uppercase tracking-widest opacity-40 mb-1'>{t('orgPersonnel.org.manager')}</p>
                      <p className='text-sm font-black italic text-slate-700'>{selectedNode.manager || t('orgPersonnel.org.none')}</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-4 p-4 rounded-2xl bg-background/50 border border-dashed border-muted/50'>
                    <div className='mt-1 bg-primary/10 p-2 rounded-full'>
                      <Briefcase className='size-4 text-primary' />
                    </div>
                    <div>
                      <p className='text-[10px] font-black uppercase tracking-widest opacity-40 mb-1'>{t('orgPersonnel.org.units')}</p>
                      <p className='text-sm font-black italic text-slate-700'>{selectedNode.children?.length || 0} {t('orgPersonnel.org.connected')}</p>
                    </div>
                  </div>
                  <div className='col-span-1 xl:col-span-2 space-y-3'>
                    <p className='text-[10px] font-black uppercase tracking-widest opacity-40 pl-1'>{t('orgPersonnel.org.functions')}</p>
                    <div className='rounded-2xl bg-background px-6 py-5 text-sm font-medium text-slate-600 leading-relaxed border border-dashed border-muted/50 shadow-inner min-h-[100px]'>
                      {selectedNode.description || t('orgPersonnel.org.noDescription')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 关联详情分类卡片 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden'>
                <Card className='flex flex-col overflow-hidden rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
                  <CardHeader className='px-6 py-4 flex flex-row items-center justify-between border-b border-dashed border-muted/50 shrink-0'>
                    <CardTitle className='text-sm font-black tracking-tighter italic uppercase'>
                      {t('orgPersonnel.org.childrenTitle')} ({selectedNode.children?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-0 flex-1 overflow-hidden'>
                    <ScrollArea className='h-[300px]'>
                      {selectedNode.children && selectedNode.children.length > 0 ? (
                        <div className='divide-y divide-dashed divide-muted/50'>
                          {selectedNode.children.map((child: OrgNode) => (
                            <div key={child.id} className='px-6 py-5 flex items-center justify-between hover:bg-background transition-colors'>
                              <div className='flex items-center gap-4'>
                                <div className='size-10 rounded-full bg-muted flex items-center justify-center border border-dashed border-muted-foreground/10'>
                                  <Warehouse className='size-4 text-muted-foreground/60' />
                                </div>
                                <div>
                                  <p className='text-sm font-black italic text-slate-700'>{child.name}</p>
                                  <p className='text-[10px] font-black uppercase tracking-widest opacity-40'>{child.manager || 'NO_MANAGER'}</p>
                                </div>
                              </div>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 rounded-full text-[10px] font-black uppercase hover:bg-background px-4 border border-dashed border-muted-foreground/10'
                                onClick={() => setSelectedNode(child)}
                              >
                                {t('orgPersonnel.org.manageDetail')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='h-full flex flex-col items-center justify-center text-muted-foreground/20 p-8'>
                          <Info className='size-8 opacity-20 mb-2' />
                          <p className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.org.noChildren')}</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className='flex flex-col overflow-hidden rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50'>
                  <CardHeader className='px-6 py-4 flex flex-row items-center justify-between border-b border-dashed border-muted/50 shrink-0'>
                    <CardTitle className='text-sm font-black tracking-tighter italic uppercase'>
                      {t('orgPersonnel.org.linkedTitle')} ({selectedNode.linkedArchitecture?.length || 0})
                    </CardTitle>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-4 rounded-full border border-dashed border-muted-foreground/20 hover:bg-background transition-all font-black text-[10px] uppercase tracking-widest'
                      onClick={() => setSelectorOpen(true)}
                    >
                      {t('orgPersonnel.org.manageLinks')}
                    </Button>
                  </CardHeader>
                  <CardContent className='p-0 flex-1 overflow-hidden'>
                    <ScrollArea className='h-[300px]'>
                      {selectedNode.linkedArchitecture && selectedNode.linkedArchitecture.length > 0 ? (
                        <div className='divide-y divide-dashed divide-muted/50'>
                          {selectedNode.linkedArchitecture.map((item: NonNullable<OrgNode['linkedArchitecture']>[number]) => (
                            <div key={item.id} className='px-6 py-5 flex items-center justify-between hover:bg-background transition-colors'>
                              <div className='flex items-center gap-4'>
                                <div className={cn(
                                    'size-10 rounded-full flex items-center justify-center border border-dashed border-muted-foreground/10',
                                    item.type === 'line' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                                )}>
                                  {item.type === 'line' ? <LayoutGrid className='size-4' /> : <GitCommit className='size-4' />}
                                </div>
                                <div>
                                  <p className='text-sm font-black italic text-slate-700'>{item.name}</p>
                                  <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                      {item.type === 'line' ? t('orgPersonnel.org.types.productionLine') : t('orgPersonnel.org.types.workshopSegment')}
                                  </p>
                                </div>
                              </div>
                              <Badge className='h-5 rounded-full px-2 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 border-none'>
                                {t('orgPersonnel.org.connected')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='h-full flex flex-col items-center justify-center text-muted-foreground/20 p-8'>
                          <LayoutGrid className='size-8 opacity-20 mb-2' />
                          <p className='text-[10px] font-black uppercase tracking-widest'>{t('orgPersonnel.org.noLinked')}</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className='flex-1 flex items-center justify-center border border-dashed border-muted/50 rounded-[24px] bg-muted/5 text-muted-foreground/40'>
              <div className='flex flex-col items-center gap-3'>
                <Users className='size-12 opacity-10' />
                <p className='text-[11px] font-black uppercase tracking-widest'>{t('orgPersonnel.org.selectHint')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <OrgActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentRow={dialogMode === 'edit' ? selectedNode || undefined : undefined}
        parentId={dialogMode === 'add' ? selectedNode?.id : undefined}
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
        handleConfirm={handleDelete}
        title={t('orgPersonnel.org.removeItem')}
        desc={t('orgPersonnel.org.deleteConfirm', { name: selectedNode?.name || '' })}
        destructive
        cancelBtnText={cancelText}
        confirmText={confirmDeleteText}
      />
    </div>
  )
}
