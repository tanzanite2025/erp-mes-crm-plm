'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useMaintenanceRecords } from '../hooks/use-maintenance-records'
import { useMaintenanceRecordForm } from '../hooks/use-maintenance-record-form'
import { useStatusTransition } from '../hooks/use-status-transition'
import type { MaintenanceRecord } from '../data/schema'
import { getStatusBadge, getPriorityBadge, getTypeBadge, formatMaintenanceDate } from '../utils/maintenance-badges'

interface MaintenanceRecordListProps {
  assetType: 'MOLD' | 'FURNACE'
  assetId: string
  assetSn: string
}

export function MaintenanceRecordList({ assetType, assetId, assetSn }: MaintenanceRecordListProps) {
  const { records, isLoading, create, patch, remove, reload } = useMaintenanceRecords({ assetType, assetId })
  const { toast } = useToast()
  const { formData, updateField, validate, reset, getSubmitData } = useMaintenanceRecordForm()
  const { getValidNextStatuses, getStatusLabel } = useStatusTransition()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null)
  const [editingRemarks, setEditingRemarks] = useState<string | null>(null)

  const handleCreate = async () => {
    const validation = validate()
    if (!validation.valid) {
      toast({
        title: '验证失败',
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    try {
      await create({
        assetType,
        assetId,
        assetSn,
        ...getSubmitData(),
      })

      setIsCreateDialogOpen(false)
      reset()

      toast({
        title: '创建成功',
        description: '维保记录已创建',
      })
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error?.message || '创建维保记录时发生错误',
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (record: MaintenanceRecord, newStatus: string) => {
    if (newStatus === record.status) return

    try {
      await patch({
        id: record.id,
        delta: { status: { o: record.status, n: newStatus } },
        version: record.version,
      })

      toast({
        title: '状态已更新',
        description: `状态已更改为${getStatusLabel(newStatus)}`,
      })
    } catch (error: any) {
      if (error?.message?.includes('409') || error?.message?.includes('conflict')) {
        toast({
          title: '更新失败',
          description: '记录已被他人修改，请刷新后重试',
          variant: 'destructive',
        })
        reload()
      } else {
        toast({
          title: '更新失败',
          description: error?.message || '更新状态时发生错误',
          variant: 'destructive',
        })
      }
    }
  }

  const handleRemarksUpdate = async (record: MaintenanceRecord, newRemarks: string) => {
    try {
      await patch({
        id: record.id,
        delta: { remarks: { o: record.remarks, n: newRemarks } },
        version: record.version,
      })
      setEditingRemarks(null)

      toast({
        title: '备注已更新',
      })
    } catch (error: any) {
      if (error?.message?.includes('409') || error?.message?.includes('conflict')) {
        toast({
          title: '更新失败',
          description: '记录已被他人修改，请刷新后重试',
          variant: 'destructive',
        })
        reload()
      } else {
        toast({
          title: '更新失败',
          description: error?.message || '更新备注时发生错误',
          variant: 'destructive',
        })
      }
      setEditingRemarks(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteRecordId) return

    try {
      await remove(deleteRecordId)
      setDeleteRecordId(null)

      toast({
        title: '删除成功',
        description: '维保记录已删除',
      })
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error?.message || '删除维保记录时发生错误',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <div className='text-sm text-muted-foreground'>加载中...</div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h4 className='text-xs font-black uppercase tracking-tight text-muted-foreground'>
          维保记录 ({records.length})
        </h4>
        <Button
          size='sm'
          variant='outline'
          className='h-7 text-[10px] font-black'
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className='size-3 mr-1' />
          新建
        </Button>
      </div>

      {records.length === 0 ? (
        <div className='text-center py-8 text-muted-foreground text-xs'>
          暂无维保记录
        </div>
      ) : (
        <div className='space-y-3'>
          {records.map((record) => (
            <div
              key={record.id}
              className='p-3 rounded-xl border border-dashed bg-muted/30 hover:bg-muted/50 transition-colors space-y-2'
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1 min-w-0 space-y-1'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    {getStatusBadge(record.status)}
                    {getPriorityBadge(record.priority)}
                    {getTypeBadge(record.type)}
                  </div>
                  <p className='text-xs font-bold truncate'>{record.title}</p>
                  {record.description && (
                    <p className='text-[10px] text-muted-foreground line-clamp-2'>
                      {record.description}
                    </p>
                  )}
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-6 shrink-0'
                  onClick={() => setDeleteRecordId(record.id)}
                >
                  <Trash2 className='size-3 text-rose-500' />
                </Button>
              </div>

              <div className='flex items-center gap-2 text-[9px] text-muted-foreground'>
                <Calendar className='size-3' />
                <span>{formatMaintenanceDate(record.createdAt)}</span>
                {record.cost > 0 && (
                  <>
                    <span>•</span>
                    <span>成本: ¥{record.cost.toFixed(2)}</span>
                  </>
                )}
              </div>

              {/* Status Edit */}
              <div className='flex items-center gap-2'>
                <Label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  状态:
                </Label>
                <Select
                  value={record.status}
                  onValueChange={(value) => handleStatusChange(record, value)}
                >
                  <SelectTrigger className='h-6 w-[120px] text-[10px] font-bold'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidNextStatuses(record.status).map((status) => (
                      <SelectItem key={status} value={status} className='text-[10px]'>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Remarks Edit */}
              {editingRemarks === record.id ? (
                <div className='space-y-2'>
                  <Textarea
                    defaultValue={record.remarks}
                    className='text-[10px] min-h-[60px]'
                    placeholder='备注...'
                    onBlur={(e) => handleRemarksUpdate(record, e.target.value)}
                  />
                </div>
              ) : (
                <div className='flex items-start gap-2'>
                  <Label className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 shrink-0'>
                    备注:
                  </Label>
                  <div className='flex-1 min-w-0'>
                    {record.remarks ? (
                      <p className='text-[10px] text-muted-foreground'>{record.remarks}</p>
                    ) : (
                      <p className='text-[10px] text-muted-foreground/40 italic'>无</p>
                    )}
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-5 shrink-0'
                    onClick={() => setEditingRemarks(record.id)}
                  >
                    <Edit2 className='size-3' />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>新建维保记录</DialogTitle>
            <DialogDescription>
              为 {assetSn} 创建维保记录
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='type'>类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => updateField('type', value)}
              >
                <SelectTrigger id='type'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='PREVENTIVE'>预防性</SelectItem>
                  <SelectItem value='CORRECTIVE'>纠正性</SelectItem>
                  <SelectItem value='INSPECTION'>检查</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='title'>标题 *</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder='输入标题'
                maxLength={255}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>描述</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder='输入描述'
                rows={3}
                maxLength={5000}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='priority'>优先级</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => updateField('priority', value)}
                >
                  <SelectTrigger id='priority'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='LOW'>低</SelectItem>
                    <SelectItem value='MEDIUM'>中</SelectItem>
                    <SelectItem value='HIGH'>高</SelectItem>
                    <SelectItem value='CRITICAL'>紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='cost'>成本</Label>
                <Input
                  id='cost'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.cost}
                  onChange={(e) => updateField('cost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='remarks'>备注</Label>
              <Textarea
                id='remarks'
                value={formData.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                placeholder='输入备注'
                rows={2}
                maxLength={5000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!formData.title.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRecordId} onOpenChange={() => setDeleteRecordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除此维保记录？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。记录将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-rose-600 hover:bg-rose-700'>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
