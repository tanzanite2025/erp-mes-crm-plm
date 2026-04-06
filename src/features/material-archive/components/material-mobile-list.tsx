import { Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { type Material } from '../data/schema'
import { resolveMaterialCategoryLabel } from '../utils/material-mgmt-utils'

interface MaterialMobileListProps {
    isLoading: boolean
    materials: Material[]
    onEdit: (material: Material) => void
}

export function MaterialMobileList({ isLoading, materials, onEdit }: MaterialMobileListProps) {
    return (
        <div className='md:hidden flex flex-col gap-4'>
            {isLoading ? (
                <div className='p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse italic'>Synchronizing Materials...</div>
            ) : materials.length === 0 ? (
                <div className='p-12 text-center bg-muted/5 rounded-[32px] border border-dashed border-muted/50'>
                    <p className='text-[10px] font-black uppercase text-muted-foreground/40 italic'>No Materials in Archive</p>
                </div>
            ) : (
                materials.map((m) => (
                    <div
                        key={m.id}
                        onClick={() => onEdit(m)}
                        className='p-5 rounded-[28px] border border-dashed border-muted/50 bg-background/50 active:scale-[0.98] transition-all relative overflow-hidden'
                    >
                        <div className='absolute top-0 right-0 p-2'>
                            <Badge variant='outline' className='text-[8px] font-black uppercase tracking-widest bg-primary/5 border-none text-primary/60 rounded-full h-4'>
                                {resolveMaterialCategoryLabel(m.category, dictionaryService.getOptions('MATERIAL_CATEGORY'))}
                            </Badge>
                        </div>

                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-2'>
                                <Hash className='size-3 text-primary opacity-40' />
                                <span className='text-[10px] font-black italic tabular-nums text-muted-foreground/60 tracking-tighter'>{m.code || 'NO-CODE'}</span>
                            </div>

                            <h4 className='text-sm font-black tracking-tight leading-tight'>{m.name}</h4>

                            <div className='flex flex-wrap gap-1.5 pt-1'>
                                {m.internalDimensions ? (
                                    <Badge variant='outline' className='text-[8px] font-black font-mono py-0 h-4 rounded-full border-none bg-primary/10 text-primary uppercase tracking-tighter px-2'>
                                        INT: {m.internalDimensions.length}*{m.internalDimensions.width}*{m.internalDimensions.height}
                                    </Badge>
                                ) : m.spec ? (
                                    <span className='text-[9px] font-bold text-muted-foreground/70 uppercase'>{m.spec}</span>
                                ) : null}
                                <Badge variant='secondary' className='rounded-full h-4 text-[8px] font-black uppercase tracking-widest bg-muted/30 border-none text-muted-foreground/50 px-2'>{m.uom}</Badge>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
