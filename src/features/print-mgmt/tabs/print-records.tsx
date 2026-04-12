'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { XCircle, Search, Printer } from 'lucide-react'
import { PrintRecordService, type PrintBatch } from '../services/print-record-service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import { useLanguage } from '@/context/language-provider'
import { PRINT_BATCHES_QUERY_KEY } from '../query-keys'

export function PrintRecords() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBatch, setSelectedBatch] = useState<PrintBatch | null>(null)
    const [isVerifyOpen, setIsVerifyOpen] = useState(false)
    const [verifyCount, setVerifyCount] = useState<number>(0)
    const { data: batches = [] } = useQuery<PrintBatch[]>({
        queryKey: PRINT_BATCHES_QUERY_KEY,
        queryFn: () => PrintRecordService.getBatches(),
    })
    const activateMutation = useMutation({
        mutationFn: ({ id, count, version }: { id: string; count: number; version: number }) =>
            PrintRecordService.activate(id, count, version),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINT_BATCHES_QUERY_KEY }),
    })
    const scrapMutation = useMutation({
        mutationFn: (id: string) => PrintRecordService.scrap(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINT_BATCHES_QUERY_KEY }),
    })

    const handleOpenVerify = (batch: PrintBatch) => {
        setSelectedBatch(batch)
        setVerifyCount(batch.quantity - batch.activatedCount)
        setIsVerifyOpen(true)
    }

    const handleVerify = async () => {
        if (!selectedBatch) return
        if (verifyCount <= 0 || verifyCount > (selectedBatch.quantity - selectedBatch.activatedCount)) {
            toast.error(t('printMgmt.records.toasts.invalidVerifyCount'))
            return
        }

        await activateMutation.mutateAsync({
            id: selectedBatch.id,
            count: verifyCount,
            version: selectedBatch.version,
        })
        toast.success(t('printMgmt.records.toasts.verifySuccess', { count: verifyCount }))
        setIsVerifyOpen(false)
    }

    const handleScrap = async (id: string) => {
        if (confirm(t('printMgmt.records.confirmScrap'))) {
            await scrapMutation.mutateAsync(id)
            toast.info(t('printMgmt.records.toasts.scrapInfo'))
        }
    }

    const filteredBatches = batches.filter(b => 
        b.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.templateName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const statusMap: Record<PrintBatch['status'], { label: string, color: string }> = {
        'Printed': { label: t('printMgmt.records.status.printed'), color: 'bg-slate-50 text-slate-500' },
        'PartiallyActivated': { label: t('printMgmt.records.status.partiallyActivated'), color: 'bg-blue-50 text-blue-600' },
        'Activated' : { label: t('printMgmt.records.status.activated'), color: 'bg-emerald-50 text-emerald-600' },
        'Scrapped': { label: t('printMgmt.records.status.scrapped'), color: 'bg-destructive/10 text-destructive' }
    }

    return (
        <>
            <div className='flex items-center justify-between p-4 bg-muted/5 rounded-[24px] border border-dashed'>
                <div className='relative max-w-sm flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50' />
                    <Input
                        placeholder={t('printMgmt.records.searchPlaceholder')}
                        className='pl-10 h-10 rounded-full bg-background border-none shadow-inner text-xs font-bold'
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground px-4'>
                    {t('printMgmt.records.totalLabel', { count: filteredBatches.length })}
                </div>
            </div>

            <div className='rounded-[24px] border bg-background overflow-hidden shadow-sm'>
                <Table>
                    <TableHeader className='bg-muted/30 h-12'>
                        <TableRow className='hover:bg-transparent border-b'>
                            <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.batchNo')}</TableHead>
                            <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.templateName')}</TableHead>
                            <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.quantity')}</TableHead>
                            <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.activation')}</TableHead>
                            <TableHead className='px-6 text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.status')}</TableHead>
                            <TableHead className='px-6 text-right text-[10px] font-black uppercase tracking-widest'>{t('printMgmt.records.tableHeaders.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBatches.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className='text-center py-20'>
                                   <div className='flex flex-col items-center justify-center text-muted-foreground/20 italic'>
                                      <Printer className='size-12 mb-4 opacity-10' />
                                      <p className='text-[11px] font-black uppercase tracking-widest'>{t('printMgmt.records.empty')}</p>
                                   </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBatches.map((batch) => (
                                <TableRow key={batch.id} className={cn(
                                    'hover:bg-muted/5 transition-colors border-b last:border-0 h-16',
                                    batch.status === 'Scrapped' && 'opacity-40 grayscale'
                                )}>
                                    <TableCell className='px-6 font-mono font-black text-xs tracking-tight'>{batch.batchNo}</TableCell>
                                    <TableCell className='px-6 text-xs font-bold'>{batch.templateName}</TableCell>
                                    <TableCell className='px-6 font-mono text-xs font-bold text-muted-foreground'>{batch.quantity}</TableCell>
                                    <TableCell className='px-6'>
                                        <div className='flex items-center gap-2'>
                                            <span className={cn(
                                                'font-mono font-black text-xs',
                                                batch.activatedCount > 0 ? 'text-primary' : 'text-muted-foreground/40'
                                            )}>
                                                {batch.activatedCount}
                                            </span>
                                            <span className='text-[9px] font-bold text-muted-foreground italic'>
                                                ({((batch.activatedCount / batch.quantity) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </TableCell>
                                    <td className='px-6'>
                                        <Badge className={cn(
                                            'text-[9px] font-black px-2 py-0 h-5 border-none uppercase',
                                            statusMap[batch.status].color
                                        )}>
                                            {statusMap[batch.status].label}
                                        </Badge>
                                    </td>
                                    <TableCell className='px-6 text-right space-x-1'>
                                        {batch.status !== 'Scrapped' && batch.status !== 'Activated' && (
                                            <Button variant='ghost' size='sm' className='h-8 rounded-full text-xs font-black text-primary hover:bg-primary/5 uppercase px-4' onClick={() => handleOpenVerify(batch)}>
                                                {t('printMgmt.records.activationButton')}
                                            </Button>
                                        )}
                                        {batch.status !== 'Scrapped' && (
                                            <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive hover:bg-destructive/10' onClick={() => handleScrap(batch.id)}>
                                                <XCircle className='size-3.5' />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
                <DialogContent className='rounded-[32px] border-none shadow-2xl'>
                    <DialogHeader>
                        <DialogTitle className='text-sm font-black uppercase tracking-tight'>{t('printMgmt.records.verifyDialog.title')}</DialogTitle>
                        <DialogDescription className='text-xs font-bold text-muted-foreground/60'>
                            {t('printMgmt.records.verifyDialog.description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='py-6 space-y-6'>
                        <div className='p-4 bg-muted/30 rounded-[20px] space-y-3 border border-dashed'>
                            <div className='flex justify-between items-center'>
                                <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>{t('printMgmt.records.verifyDialog.batchLabel')}</span>
                                <span className='text-xs font-mono font-black text-primary'>{selectedBatch?.batchNo}</span>
                            </div>
                            <div className='flex justify-between items-center'>
                                <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>{t('printMgmt.records.verifyDialog.pendingLabel')}</span>
                                <span className='text-xs font-black text-emerald-600'>{(selectedBatch?.quantity || 0) - (selectedBatch?.activatedCount || 0)}</span>
                            </div>
                        </div>
                        <div className='space-y-3'>
                            <Label htmlFor='v-count' className='text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1'>{t('printMgmt.records.verifyDialog.inputLabel')}</Label>
                            <Input 
                                id='v-count'
                                type='number' 
                                value={verifyCount} 
                                onChange={e => setVerifyCount(parseInt(e.target.value) || 0)}
                                className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-mono text-base font-black focus:ring-2 focus:ring-primary/20 outline-none transition-all'
                            />
                            <p className='text-[9px] font-bold text-muted-foreground/40 italic leading-relaxed pl-1'>
                                {t('printMgmt.records.verifyDialog.hint')}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className='bg-muted/30 p-4 -mx-6 -mb-6 rounded-b-[32px]'>
                        <Button variant='ghost' className='rounded-full text-xs font-bold' onClick={() => setIsVerifyOpen(false)}>{t('printMgmt.records.verifyDialog.cancel')}</Button>
                        <Button onClick={handleVerify} className='rounded-full text-xs font-black shadow-lg shadow-primary/20'>{t('printMgmt.records.verifyDialog.confirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
