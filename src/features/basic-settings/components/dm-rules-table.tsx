import {
    Edit3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TranslationKey } from '@/locales'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { type DMRuleSegment } from '../data/dm-rules-config'
import { type AppearanceMapping } from './appearance-action-dialog'
import { useLanguage } from '@/context/language-provider'

interface DMRulesTableProps {
    rules: DMRuleSegment[]
    appearanceMapping: AppearanceMapping | null
    onEdit: (segment: DMRuleSegment) => void
    translationPrefix?: 'basicSettings.dmNumbering' | 'basicSettings.linearBarcode'
    lengthLabel?: string
}

export function DMRulesTable({
    rules,
    appearanceMapping,
    onEdit,
    translationPrefix = 'basicSettings.dmNumbering',
    lengthLabel = 'BIT',
}: DMRulesTableProps) {
    const { t } = useLanguage()

    return (
        <div className='bg-muted/5 rounded-[24px] border border-dashed border-muted/50 overflow-hidden'>
            <Table>
                <TableHeader>
                    <TableRow className='hover:bg-transparent border-muted/50'>
                        <TableHead className='w-[100px] h-14 pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                            {t(`${translationPrefix}.table.headers.segment` as TranslationKey)}
                        </TableHead>
                        <TableHead className='h-14 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-center'>
                            {t(`${translationPrefix}.table.headers.description` as TranslationKey)}
                        </TableHead>
                        <TableHead className='h-14 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-center'>
                            {t(`${translationPrefix}.table.headers.example` as TranslationKey)}
                        </TableHead>
                        <TableHead className='w-[100px] h-14 pr-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-right'>
                            {t(`${translationPrefix}.table.headers.action` as TranslationKey)}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rules.map((segment) => (
                        <TableRow key={segment.id} className='group hover:bg-muted/30 border-muted/30 transition-colors'>
                            <TableCell className='pl-8 py-5'>
                                <div className='flex flex-col gap-1'>
                                    <span className='font-mono text-[11px] font-black text-rose-600/80 tracking-tighter'>
                                        {segment.length} {lengthLabel} / {segment.id.toUpperCase()}
                                    </span>
                                    <span className='text-[10px] font-black text-slate-800 dark:text-muted-foreground/80 italic'>
                                        {t(`${translationPrefix}.table.segments.${segment.id}.name` as TranslationKey) || segment.name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className='py-5'>
                                <p className='text-[10px] font-medium text-muted-foreground leading-relaxed max-w-[300px] mx-auto text-center opacity-80'>
                                    {t(`${translationPrefix}.table.segments.${segment.id}.desc` as TranslationKey) || segment.description}
                                </p>
                            </TableCell>
                            <TableCell className='py-5'>
                                <div className='flex flex-wrap gap-1.5 justify-center'>
                                    {segment.id === 'appearance' && appearanceMapping ? (
                                        Object.entries(appearanceMapping).slice(0, 3).map(([key, item]) => (
                                            <span key={key} className='px-2 py-0.5 rounded-md bg-muted text-[9px] font-black font-mono text-muted-foreground/60 border border-muted-foreground/5'>
                                                {key}={item.label}
                                            </span>
                                        ))
                                    ) : (
                                        segment.examples?.slice(0, 3).map((ex, idx) => (
                                            <span key={idx} className='px-2 py-0.5 rounded-md bg-muted text-[9px] font-black font-mono text-muted-foreground/60 border border-muted-foreground/5'>
                                                {ex}
                                            </span>
                                        ))
                                    )}
                                    {(segment.examples?.length || 0) > 3 && (
                                        <span className='text-[9px] font-black text-muted-foreground/30 self-center ml-1'>...</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className='pr-8 py-5 text-right'>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    className='size-8 rounded-full hover:bg-rose-500/10 hover:text-rose-600'
                                    onClick={() => onEdit(segment)}
                                >
                                    <Edit3 className='size-3.5' />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
