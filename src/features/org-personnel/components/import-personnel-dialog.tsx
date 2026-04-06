import { useState } from 'react'
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadXLSX } from '@/lib/lazy-vendors'
import { createLogger } from '@/lib/logger'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'

import { EmployeeService } from '../services/employee-service'
import { OrgService } from '../services/org-service'
import {
    downloadPersonnelTemplate,
    generateDeptMap,
    mapExcelToEmployees,
    validatePersonnelWorkbookStructure,
} from '../utils/personnel-import-utils'

const logger = createLogger('ImportPersonnelDialog')

type ImportPersonnelDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function ImportPersonnelDialog({
    open,
    onOpenChange,
    onSuccess,
}: ImportPersonnelDialogProps) {
    const { locale, t } = useLanguage()
    const [file, setFile] = useState<File | null>(null)
    const [sheetName, setSheetName] = useState('')
    const [isParsing, setIsParsing] = useState(false)
    const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
    const [mappedData, setMappedData] = useState<Record<string, unknown>[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isImporting, setIsImporting] = useState(false)

    const reset = () => {
        setFile(null)
        setSheetName('')
        setPreviewData([])
        setMappedData([])
        setError(null)
        setIsParsing(false)
        setIsImporting(false)
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0]
        if (!selectedFile) return

        reset()
        setFile(selectedFile)
        setIsParsing(true)

        try {
            const data = await selectedFile.arrayBuffer()
            const XLSX = await loadXLSX()
            const workbook = XLSX.read(data, { type: 'array', cellDates: true })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

            validatePersonnelWorkbookStructure(jsonData, firstSheetName)
            setSheetName(firstSheetName)
            setPreviewData(jsonData)

            const mapped = mapExcelToEmployees(jsonData, {}, { skipDeptResolution: true })
            setMappedData(mapped)
            setError(null)
        } catch (err) {
            logger.error('Parse failed', err)
            setError(err instanceof Error ? err.message : t('orgPersonnel.importDialog.parseFailed'))
        } finally {
            setIsParsing(false)
        }
    }

    const startImport = async () => {
        if (mappedData.length === 0 || error) return
        setIsImporting(true)

        try {
            const orgData = await OrgService.getOrgTree()
            const deptMap = generateDeptMap(orgData)

            validatePersonnelWorkbookStructure(previewData, sheetName)
            const finalMapped = mapExcelToEmployees(previewData, deptMap)

            await EmployeeService.syncEmployees(finalMapped)

            toast.success(t('orgPersonnel.importDialog.importSuccess', { count: finalMapped.length }))
            onSuccess?.()
            onOpenChange(false)
            reset()
        } catch (err) {
            logger.error('Execution failed', err)
            toast.error(t('orgPersonnel.importDialog.importFailed', {
                message: err instanceof Error ? err.message : 'Unknown error'
            }))
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) reset()
                onOpenChange(nextOpen)
            }}
        >
            <DialogContent className='sm:max-w-2xl rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
                <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50'>
                    <DialogTitle className='text-lg font-black tracking-tighter italic uppercase flex items-center gap-2'>
                        <FileSpreadsheet className='size-5 text-blue-600' />
                        {t('orgPersonnel.importDialog.title')}
                    </DialogTitle>
                    <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center justify-between'>
                        <span>{t('orgPersonnel.importDialog.description')}</span>
                        <Button
                            variant='link'
                            size='sm'
                            className='h-auto p-0 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 underline underline-offset-4'
                            onClick={() => downloadPersonnelTemplate(locale)}
                        >
                            <FileSpreadsheet className='mr-1 size-3' /> {t('orgPersonnel.importDialog.downloadTemplate')}
                        </Button>
                    </DialogDescription>
                </DialogHeader>

                <div className='p-8 space-y-6'>
                    {!file ? (
                        <label className='flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted/50 rounded-[24px] bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer group'>
                            <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                                <div className='p-4 rounded-full bg-blue-500/10 mb-4 group-hover:scale-110 transition-transform'>
                                    <Upload className='size-8 text-blue-600' />
                                </div>
                                <p className='text-sm font-black uppercase tracking-tighter italic'>{t('orgPersonnel.importDialog.clickToUpload')}</p>
                                <p className='text-[10px] mt-2 font-black uppercase tracking-widest opacity-40'>{t('orgPersonnel.importDialog.support')}</p>
                            </div>
                            <input type='file' className='hidden' accept='.xlsx, .xls' onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className='space-y-4 animate-in fade-in slide-in-from-bottom-2'>
                            {error ? (
                                <div className='flex items-start justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200'>
                                    <div className='flex items-start gap-3'>
                                        <AlertCircle className='size-5 text-rose-500 mt-0.5' />
                                        <div className='overflow-hidden'>
                                            <p className='text-[11px] font-bold text-rose-900 uppercase'>{t('orgPersonnel.importDialog.auditFailed')}</p>
                                            <pre className='text-[10px] text-rose-600 mt-1.5 leading-relaxed font-mono whitespace-pre-wrap break-all'>
                                                {error}
                                            </pre>
                                        </div>
                                    </div>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 hover:text-rose-700 shrink-0'
                                        onClick={reset}
                                    >
                                        {t('orgPersonnel.importDialog.retry')}
                                    </Button>
                                </div>
                            ) : (
                                <div className='flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20'>
                                    <div className='flex items-center gap-3'>
                                        <CheckCircle2 className='size-5 text-emerald-500' />
                                        <div>
                                            <p className='text-xs font-bold text-emerald-950 uppercase'>{file.name}</p>
                                            <p className='text-[10px] text-emerald-600/60 font-black tracking-widest uppercase'>
                                                {t('orgPersonnel.importDialog.previewReady', { sheetName, count: mappedData.length })}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant='ghost' size='sm' className='text-[10px] font-black uppercase' onClick={reset}>
                                        {t('orgPersonnel.importDialog.changeFile')}
                                    </Button>
                                </div>
                            )}

                            {mappedData.length > 0 && (
                                <div className='rounded-2xl border border-dashed border-muted overflow-hidden'>
                                    <p className='bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-dashed'>
                                        {t('orgPersonnel.importDialog.preview')}
                                    </p>
                                    <ScrollArea className='h-32'>
                                        <div className='p-3 space-y-2'>
                                            {mappedData.slice(0, 5).map((row, index) => (
                                                <div
                                                    key={index}
                                                    className='flex gap-4 text-[10px] font-mono text-muted-foreground/80 border-b border-muted/20 pb-1 last:border-0'
                                                >
                                                    <span className='w-[100px] shrink-0 font-bold text-primary'>{String(row.staffId || '-')}</span>
                                                    <span className='w-[80px] shrink-0 font-bold text-slate-700'>{String(row.name || '-')}</span>
                                                    <span className='w-[80px] shrink-0'>{String(row.gender || '-')}</span>
                                                    <span className='truncate'>{String(row.phone || '-')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}

                            <div className='flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10'>
                                <AlertCircle className='size-4 text-amber-500 shrink-0 mt-0.5' />
                                <p className='text-[9px] text-amber-700 font-medium leading-relaxed italic'>
                                    {t('orgPersonnel.importDialog.warning')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50'>
                    <Button
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='h-11 px-8 font-black text-[10px] uppercase tracking-widest'
                    >
                        {t('orgPersonnel.importDialog.cancel')}
                    </Button>
                    <Button
                        onClick={startImport}
                        disabled={!file || isImporting || isParsing || !!error}
                        className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
                    >
                        {isImporting ? t('orgPersonnel.importDialog.syncing') : t('orgPersonnel.importDialog.executeImport')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
