'use client'

import { ListChecks } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface VariantMatrixSectionProps {
    versionLevelOptions: any[]
    selectedVariants: { level: string; weight: number }[]
    onVariantToggle: (level: string, checked: boolean) => void
    onWeightChange: (level: string, weight: number) => void
}

export function VariantMatrixSection({
    versionLevelOptions,
    selectedVariants,
    onVariantToggle,
    onWeightChange
}: VariantMatrixSectionProps) {
    return (
        <div className='p-2 bg-blue-600/5 rounded-xl border border-blue-600/10 space-y-2'>
            <div className='flex items-center gap-2 text-blue-700'>
                <ListChecks className='size-3' />
                <span className='text-[10px] font-black uppercase tracking-wider'>多版本规格-重量矩阵 (多选即触发批量分发)</span>
            </div>
            
            <div className='grid grid-cols-2 gap-x-2 gap-y-1'>
                {versionLevelOptions.map(opt => {
                    const isSelected = selectedVariants.some(v => v.level === opt.value)
                    const variant = selectedVariants.find(v => v.level === opt.value)
                    
                    return (
                        <div 
                            key={opt.value} 
                            className={`flex items-center justify-between p-1 px-1.5 rounded border transition-all ${
                                isSelected 
                                ? 'bg-background border-blue-200 shadow-sm' 
                                : 'text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-muted/5'
                            }`}
                        >
                            <div className='flex items-center space-x-1.5'>
                                <Checkbox 
                                    id={`spec-level-${opt.value}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => onVariantToggle(opt.value, !!checked)}
                                    className='size-3.5 data-[state=checked]:bg-blue-600'
                                />
                                <Label 
                                    htmlFor={`spec-level-${opt.value}`} 
                                    className='text-[10px] font-bold cursor-pointer'
                                >
                                    {opt.label}
                                </Label>
                            </div>
                            
                            {isSelected && (
                                <div className='flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200'>
                                    <div className='text-[9px] text-muted-foreground mr-0.5'>标准重:</div>
                                    <Input 
                                        type='number'
                                        className='h-6 w-16 text-xs font-mono font-bold bg-blue-50/50 border-blue-100 focus-visible:ring-blue-400'
                                        value={variant?.weight ?? ''}
                                        placeholder='克 (g)'
                                        onChange={(e) => onWeightChange(opt.value, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    />
                                    <span className='text-[9px] font-bold text-blue-600/40'>g</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
