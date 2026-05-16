'use client'

import { ListChecks } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface VariantMatrixSectionProps {
    versionLevelOptions: any[]
    selectedVariants: { level: string }[]
    onVariantToggle: (level: string, checked: boolean) => void
}

export function VariantMatrixSection({
    versionLevelOptions,
    selectedVariants,
    onVariantToggle
}: VariantMatrixSectionProps) {
    return (
        <div className='p-2 bg-blue-600/5 rounded-xl border border-blue-600/10 space-y-2'>
            <div className='flex items-center gap-2 text-blue-700'>
                <ListChecks className='size-3' />
                <span className='text-[10px] font-black uppercase tracking-wider'>多版本规格 (多选即触发批量分发)</span>
            </div>

            <div className='grid grid-cols-2 gap-x-2 gap-y-1'>
                {versionLevelOptions.map(opt => {
                    const isSelected = selectedVariants.some(v => v.level === opt.value)

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
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
