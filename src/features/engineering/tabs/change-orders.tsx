'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitBranchPlus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { normalizeChangeOrderNo, normalizeRevisionNo, normalizeSiteCode } from '@/lib/codecs/code-normalization'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { type ChangeOrder } from '../data/schema'
import { useChangeOrderWriteActions } from '../hooks/use-change-order-write-actions'
import { CHANGE_ORDERS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'
import { buildChangeOrderDraft } from '../utils/default-builders'

const logger = createLogger('ChangeOrdersTab')

const EMPTY_ORDER: ChangeOrder = buildChangeOrderDraft()

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function ChangeOrdersTab() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<ChangeOrder>(EMPTY_ORDER)
  const { saveChangeOrder, deleteChangeOrder } = useChangeOrderWriteActions()

  const changeOrdersQuery = useQuery({
    queryKey: CHANGE_ORDERS_QUERY_KEY,
    queryFn: () => changeOrderService.getChangeOrders(),
  })

  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => ProductCoreService.getProducts(),
  })

  const changeOrders = useMemo(() => {
    if (changeOrdersQuery.isLoading) return []
    if (!changeOrdersQuery.data) {
      const error = new Error('[CRITICAL] Change order list is missing after load')
      failLoudly(error, 'ChangeOrdersTab.changeOrders')
      throw error
    }
    return changeOrdersQuery.data
  }, [changeOrdersQuery.data, changeOrdersQuery.isLoading])
  const products = useMemo(() => {
    if (productsQuery.isLoading) return []
    if (!productsQuery.data) {
      const error = productsQuery.error instanceof Error
        ? productsQuery.error
        : new Error('[CRITICAL] Product scope options are missing after load')
      failLoudly(error, 'ChangeOrdersTab.products')
      throw error
    }
    return productsQuery.data
  }, [productsQuery.data, productsQuery.error, productsQuery.isLoading])
  const isLoading = changeOrdersQuery.isLoading || productsQuery.isLoading
  const error = changeOrdersQuery.error ?? productsQuery.error

  const productNameMap = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, `${product.sku} / ${product.name}`])),
    [products]
  )

  useEffect(() => {
    if (!error) return
    logger.error('Failed to load change orders', error)
    toast.error(t('engineering.changeOrders.toasts.loadFailed'))
  }, [error, t])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleAdd = () => {
    setEditingOrder(buildChangeOrderDraft())
    setOpen(true)
  }

  const handleEdit = (order: ChangeOrder) => {
    setEditingOrder(buildChangeOrderDraft(order))
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('engineering.changeOrders.actions.deleteConfirm'))) return

    try {
      await deleteChangeOrder(id)
      toast.success(t('engineering.changeOrders.toasts.deleteSuccess'))
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('engineering.changeOrders.toasts.deleteFailed'))
    }
  }

  const handleSave = async () => {
    if (!(editingOrder.changeOrderNo || '').trim() || !(editingOrder.title || '').trim()) {
      toast.error(t('engineering.changeOrders.toasts.required'))
      return
    }

    try {
      await saveChangeOrder({
        ...editingOrder,
        productId: editingOrder.productId?.trim() || undefined,
        changeOrderNo: normalizeChangeOrderNo(editingOrder.changeOrderNo),
        siteCode: normalizeSiteCode(editingOrder.siteCode),
        revisionNo: normalizeRevisionNo(editingOrder.revisionNo),
        isDefaultSite: !normalizeSiteCode(editingOrder.siteCode) || editingOrder.isDefaultSite,
        effectiveFrom: editingOrder.effectiveFrom || undefined,
        effectiveTo: editingOrder.effectiveTo || undefined,
      })
      setOpen(false)
      toast.success(t('engineering.changeOrders.toasts.saveSuccess'))
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('engineering.changeOrders.toasts.conflict'))
        return
      }
      toast.error(error instanceof Error ? error.message : t('engineering.changeOrders.toasts.saveFailed'))
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <GitBranchPlus className='size-4 text-primary' />
          <h3 className='text-lg font-black uppercase tracking-tighter italic'>{t('engineering.changeOrders.title')}</h3>
        </div>
        <p className='mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
          {t('engineering.changeOrders.description')}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
          {t('engineering.changeOrders.stats', { count: changeOrders.length })}
        </div>
        <Button
          onClick={handleAdd}
          className='h-11 rounded-full bg-blue-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700'
        >
          {t('engineering.changeOrders.newOrder')}
        </Button>
      </div>

      <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/3 shadow-inner'>
        <CardContent className='overflow-x-auto p-0'>
          <div className='min-w-[980px]'>
            <Table>
              <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
                <TableRow className='border-none hover:bg-transparent'>
                  <TableHead className='h-12 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.order')}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.product')}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.siteRevision')}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.effective')}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.status')}</TableHead>
                  <TableHead className='text-right text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{t('engineering.changeOrders.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx} className='animate-pulse'>
                      <TableCell colSpan={6} className='py-4'>
                        <div className='h-12 rounded-xl bg-muted/50' />
                      </TableCell>
                    </TableRow>
                  ))
                ) : changeOrders.length > 0 ? (
                  changeOrders.map((order) => (
                    <TableRow key={order.id} className='transition-colors hover:bg-slate-50/30'>
                      <TableCell className='py-3'>
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono text-sm font-bold text-slate-800'>{order.changeOrderNo}</span>
                            <Badge variant='outline'>{order.changeType}</Badge>
                          </div>
                          <span className='text-sm font-bold text-slate-700'>{order.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className='py-3 text-sm text-slate-600'>
                        {order.productId ? productNameMap[order.productId] || order.productId : t('engineering.changeOrders.scopes.general')}
                      </TableCell>
                      <TableCell className='py-3'>
                        <div className='flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide'>
                          <span>{order.siteCode || t('engineering.changeOrders.site.default')}</span>
                          <span className='font-mono text-muted-foreground'>{order.revisionNo || 'R1'}</span>
                        </div>
                      </TableCell>
                      <TableCell className='py-3 text-[11px] font-bold text-muted-foreground'>
                        <div>{order.effectiveFrom ? t('engineering.changeOrders.effective.from', { date: formatDateInput(order.effectiveFrom) }) : t('engineering.changeOrders.effective.noStart')}</div>
                        <div>{order.effectiveTo ? t('engineering.changeOrders.effective.to', { date: formatDateInput(order.effectiveTo) }) : t('engineering.changeOrders.effective.openEnded')}</div>
                      </TableCell>
                      <TableCell className='py-3'>
                        <Badge
                          variant='outline'
                          className={
                            order.status === 'released'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : order.status === 'obsolete'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                          }
                        >
                          {t(`engineering.changeOrders.status.${order.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-3 text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-blue-50' onClick={() => handleEdit(order)}>
                            <Pencil className='size-4' />
                          </Button>
                          <Button variant='ghost' size='icon' className='size-8 rounded-full text-rose-500 hover:bg-rose-50' onClick={() => handleDelete(order.id)}>
                            <Trash2 className='size-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className='h-48 text-center'>
                      <div className='flex flex-col items-center justify-center gap-3 opacity-40'>
                        <GitBranchPlus className='size-10 text-muted-foreground stroke-1' />
                        <p className='text-[10px] font-semibold uppercase tracking-widest italic'>
                           {t('engineering.changeOrders.table.empty')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-3xl rounded-[32px] border-none p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-4 text-start'>
            <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800'>
              {editingOrder.id ? t('engineering.changeOrders.dialog.edit') : t('engineering.changeOrders.dialog.create')}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {t('engineering.changeOrders.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-12'>
            <div className='space-y-2 sm:col-span-4'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.orderNo')}</Label>
              <Input
                value={editingOrder.changeOrderNo || ''}
                onChange={(event) =>
                  setEditingOrder((prev) => ({
                    ...prev,
                    changeOrderNo: normalizeChangeOrderNo(event.target.value),
                  }))
                }
                className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner'
                placeholder={t('engineering.changeOrders.placeholders.orderNo')}
              />
            </div>
            <div className='space-y-2 sm:col-span-8'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.title')}</Label>
              <Input
                value={editingOrder.title || ''}
                onChange={(event) => setEditingOrder((prev) => ({ ...prev, title: event.target.value }))}
                className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                placeholder={t('engineering.changeOrders.placeholders.title')}
              />
            </div>

            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.type')}</Label>
              <Select
                value={editingOrder.changeType || 'ECO'}
                onValueChange={(value) => setEditingOrder((prev) => ({ ...prev, changeType: value as 'ECO' | 'ECN' }))}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'>
                  <SelectValue placeholder={t('engineering.changeOrders.placeholders.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ECO'>{t('engineering.changeOrders.types.eco')}</SelectItem>
                  <SelectItem value='ECN'>{t('engineering.changeOrders.types.ecn')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.status')}</Label>
              <Select
                value={editingOrder.status || 'draft'}
                onValueChange={(value) => setEditingOrder((prev) => ({ ...prev, status: value as 'draft' | 'released' | 'obsolete' }))}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'>
                  <SelectValue placeholder={t('engineering.changeOrders.placeholders.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='draft'>{t('engineering.changeOrders.status.draft')}</SelectItem>
                  <SelectItem value='released'>{t('engineering.changeOrders.status.released')}</SelectItem>
                  <SelectItem value='obsolete'>{t('engineering.changeOrders.status.obsolete')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2 sm:col-span-6'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.productScope')}</Label>
              <Select
                value={editingOrder.productId || 'general'}
                onValueChange={(value) => setEditingOrder((prev) => ({ ...prev, productId: value === 'general' ? '' : value }))}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'>
                  <SelectValue placeholder={t('engineering.changeOrders.placeholders.productScope')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='general'>{t('engineering.changeOrders.scopes.general')}</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.sku} / {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.siteCode')}</Label>
              <Input
                value={editingOrder.siteCode || ''}
                onChange={(event) => {
                  const normalizedSiteCode = normalizeSiteCode(event.target.value)
                  setEditingOrder((prev) => ({
                    ...prev,
                    siteCode: normalizedSiteCode,
                    isDefaultSite: normalizedSiteCode === '',
                  }))
                }}
                className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner'
                placeholder={t('engineering.changeOrders.placeholders.siteCode')}
              />
            </div>
            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.revision')}</Label>
              <Input
                value={editingOrder.revisionNo || ''}
                onChange={(event) =>
                  setEditingOrder((prev) => ({
                    ...prev,
                    revisionNo: normalizeRevisionNo(event.target.value),
                  }))
                }
                className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner'
                placeholder={t('engineering.changeOrders.placeholders.revision')}
              />
            </div>
            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.effectiveFrom')}</Label>
              <Input
                type='date'
                value={editingOrder.effectiveFrom || ''}
                onChange={(event) => setEditingOrder((prev) => ({ ...prev, effectiveFrom: event.target.value }))}
                className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
              />
            </div>
            <div className='space-y-2 sm:col-span-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.effectiveTo')}</Label>
              <Input
                type='date'
                value={editingOrder.effectiveTo || ''}
                onChange={(event) => setEditingOrder((prev) => ({ ...prev, effectiveTo: event.target.value }))}
                className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
              />
            </div>

            <div className='space-y-2 sm:col-span-12'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('engineering.changeOrders.fields.description')}</Label>
              <Textarea
                value={editingOrder.description || ''}
                onChange={(event) => setEditingOrder((prev) => ({ ...prev, description: event.target.value }))}
                className='min-h-28 rounded-2xl border-none bg-muted/50 text-sm shadow-inner'
                placeholder={t('engineering.changeOrders.placeholders.description')}
              />
            </div>
          </div>

          <DialogFooter className='border-t border-dashed border-muted/50 bg-muted/5 px-8 py-4'>
            <Button variant='ghost' onClick={() => setOpen(false)} className='rounded-full'>
              {t('engineering.changeOrders.actions.cancel')}
            </Button>
            <Button onClick={handleSave} className='rounded-full bg-blue-600 px-8 hover:bg-blue-700'>
               {t('engineering.changeOrders.actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
