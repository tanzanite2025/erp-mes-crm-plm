'use client'

import { Truck } from 'lucide-react'
import {
    Dialog,
    DialogContent,
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ImageUpload } from './image-upload'
import { type EquipmentPartner, type Mold } from '../data/schema'
import { type LoanDraft, type LoanMode } from '../hooks/use-mold-loan-mgmt'
import { useLanguage } from '@/context/language-provider'

interface MoldLoanActionDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    mode: LoanMode
    onModeChange: (mode: LoanMode) => void
    newLoan: LoanDraft
    onLoanChange: (draft: LoanDraft) => void
    molds: Mold[]
    partners: EquipmentPartner[]
    onSubmit: () => void
}

export function MoldLoanActionDialog({
    isOpen,
    onOpenChange,
    mode,
    onModeChange,
    newLoan,
    onLoanChange,
    molds,
    partners,
    onSubmit
}: MoldLoanActionDialogProps) {
    const { t } = useLanguage()

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden'>
                <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4'>
                    <DialogTitle className='text-xl font-black tracking-tighter flex items-center gap-2'>
                        <Truck className='size-6 text-blue-600' />
                        {t('equipmentTooling.loans.dialog.title')}
                    </DialogTitle>
                </DialogHeader>
                
                <div className='flex-1 overflow-y-auto px-6 sm:p-8 pt-0 custom-scrollbar space-y-6 pb-8'>
                    <div className='flex p-1.5 bg-muted/50 rounded-2xl gap-1.5 border border-dashed border-slate-200'>
                        <Button
                            variant={mode === 'LEND' ? 'default' : 'ghost'}
                            className={cn(
                                'flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest h-10',
                                mode === 'LEND' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-muted-foreground/60'
                            )}
                            onClick={() => onModeChange('LEND')}
                        >
                            {t('equipmentTooling.loans.dialog.modes.lend')}
                        </Button>
                        <Button
                            variant={mode === 'BORROW' ? 'default' : 'ghost'}
                            className={cn(
                                'flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest h-10',
                                mode === 'BORROW' ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-muted-foreground/60'
                            )}
                            onClick={() => onModeChange('BORROW')}
                        >
                            {t('equipmentTooling.loans.dialog.modes.borrow')}
                        </Button>
                    </div>

                    <div className='space-y-6'>
                        {mode === 'LEND' ? (
                            <>
                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                        {t('equipmentTooling.loans.dialog.fields.mold')}
                                    </Label>
                                    <Select 
                                        value={newLoan.moldId} 
                                        onValueChange={(val) => onLoanChange({ ...newLoan, moldId: val })}
                                    >
                                        <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 focus:ring-blue-500/20'>
                                            <SelectValue placeholder={t('equipmentTooling.loans.dialog.placeholders.selectMold')} />
                                        </SelectTrigger>
                                        <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                            {molds.map((mold) => (
                                                <SelectItem key={mold.id} value={mold.id} className='rounded-xl font-medium'>
                                                    {mold.sn} - {mold.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.fromFactory')}
                                        </Label>
                                        <Select 
                                            value={newLoan.fromFactory} 
                                            onValueChange={(val) => onLoanChange({ ...newLoan, fromFactory: val })}
                                        >
                                            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50'>
                                                <SelectValue placeholder={t('equipmentTooling.loans.dialog.placeholders.selectSourceFactory')} />
                                            </SelectTrigger>
                                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                {partners.map((p) => (
                                                    <SelectItem key={p.id} value={p.name} className='rounded-xl'>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.toFactory')}
                                        </Label>
                                        <Select 
                                            value={newLoan.toFactory} 
                                            onValueChange={(val) => onLoanChange({ ...newLoan, toFactory: val })}
                                        >
                                            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50'>
                                                <SelectValue placeholder={t('equipmentTooling.loans.dialog.placeholders.selectTargetFactory')} />
                                            </SelectTrigger>
                                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                {partners.map((p) => (
                                                    <SelectItem key={p.id} value={p.name} className='rounded-xl'>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-dashed pb-4 mb-4'>
                                    <div className='space-y-2 font-bold'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.externalSn')}
                                        </Label>
                                        <Input
                                            className='h-12 rounded-2xl border-none bg-muted/50 font-mono'
                                            placeholder={t('equipmentTooling.loans.dialog.placeholders.moldSn')}
                                            value={newLoan.moldSn}
                                            onChange={(e) => onLoanChange({ ...newLoan, moldSn: e.target.value })}
                                        />
                                    </div>
                                    <div className='space-y-2 font-bold'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.moldName')}
                                        </Label>
                                        <Input
                                            className='h-12 rounded-2xl border-none bg-muted/50'
                                            placeholder={t('equipmentTooling.loans.dialog.placeholders.moldName')}
                                            value={newLoan.moldName}
                                            onChange={(e) => onLoanChange({ ...newLoan, moldName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.sourceFactory')}
                                        </Label>
                                        <Select 
                                            value={newLoan.fromFactory} 
                                            onValueChange={(val) => onLoanChange({ ...newLoan, fromFactory: val })}
                                        >
                                            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50'>
                                                <SelectValue placeholder={t('equipmentTooling.loans.dialog.placeholders.selectPartner')} />
                                            </SelectTrigger>
                                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                                {partners.map((p) => (
                                                    <SelectItem key={p.id} value={p.name} className='rounded-xl'>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                            {t('equipmentTooling.loans.dialog.fields.currentCycles')}
                                        </Label>
                                        <Input
                                            className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold'
                                            type='number'
                                            value={newLoan.currentCycles}
                                            onChange={(e) => onLoanChange({ ...newLoan, currentCycles: parseInt(e.target.value, 10) || 0 })}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                {t('equipmentTooling.loans.dialog.fields.contact')}
                            </Label>
                            <Input
                                className='h-12 rounded-2xl border-none bg-muted/50'
                                placeholder={t('equipmentTooling.loans.dialog.placeholders.contact')}
                                value={newLoan.contactPerson}
                                onChange={(e) => onLoanChange({ ...newLoan, contactPerson: e.target.value })}
                            />
                        </div>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                    {t('equipmentTooling.loans.dialog.fields.loanDate')}
                                </Label>
                                <Input
                                    className='h-12 rounded-2xl border-none bg-muted/50'
                                    type='date'
                                    value={newLoan.loanDate}
                                    onChange={(e) => onLoanChange({ ...newLoan, loanDate: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                    {t('equipmentTooling.loans.dialog.fields.expectedReturnDate')}
                                </Label>
                                <Input
                                    className='h-12 rounded-2xl border-none bg-muted/50'
                                    type='date'
                                    value={newLoan.expectedReturnDate}
                                    onChange={(e) => onLoanChange({ ...newLoan, expectedReturnDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>
                                {t('equipmentTooling.loans.dialog.fields.remarks')}
                            </Label>
                            <Input
                                className='h-12 rounded-2xl border-none bg-muted/50'
                                placeholder={t('equipmentTooling.loans.dialog.placeholders.remarks')}
                                value={newLoan.remarks}
                                onChange={(e) => onLoanChange({ ...newLoan, remarks: e.target.value })}
                            />
                        </div>

                        <div className='pt-2'>
                            <ImageUpload
                                value={newLoan.photoUrl}
                                onChange={(val) => onLoanChange({ ...newLoan, photoUrl: val })}
                                label={t('equipmentTooling.loans.dialog.fields.photo')}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
                    <Button
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
                    >
                        {t('equipmentTooling.loans.dialog.actions.cancel')}
                    </Button>
                    <Button
                        onClick={onSubmit}
                        className={cn(
                            'flex-1 sm:flex-none rounded-full shadow-lg h-11 px-10 font-black text-[10px] uppercase tracking-widest',
                            mode === 'LEND' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                        )}
                    >
                        {t('equipmentTooling.loans.dialog.actions.submit', {
                            mode: mode === 'LEND'
                                ? t('equipmentTooling.loans.dialog.modes.lend')
                                : t('equipmentTooling.loans.dialog.modes.borrow'),
                        })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
