import { useMemo } from 'react'
import { Hash } from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { getMaterialCategoryOptions } from '../data/material-category-options'
import { type Material } from '../data/schema'
import {
  formatMaterialInternalDimensions,
  resolveMaterialCategoryLabel,
} from '../utils/material-mgmt-utils'

interface MaterialMobileListProps {
  isLoading: boolean
  materials: Material[]
  onEdit: (material: Material) => void
}

export function MaterialMobileList({
  isLoading,
  materials,
  onEdit,
}: MaterialMobileListProps) {
  const { locale, t } = useLanguage()
  const categoryOptions = useMemo(
    () => getMaterialCategoryOptions(locale),
    [locale]
  )

  return (
    <div className='flex flex-col gap-4 md:hidden'>
      {isLoading ? (
        <div className='animate-pulse p-8 text-center text-[10px] font-black tracking-widest text-muted-foreground uppercase italic'>
          {t('materialArchive.mobile.loading')}
        </div>
      ) : materials.length === 0 ? (
        <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-12 text-center'>
          <p className='text-[10px] font-black text-muted-foreground/40 uppercase italic'>
            {t('materialArchive.mobile.empty')}
          </p>
        </div>
      ) : (
        materials.map((m) => {
          if (!m.code) {
            const error = new Error(
              `[CRITICAL] Missing material code for mobile list item ${m.id}`
            )
            failLoudly(error, 'MaterialMobileList.code')
            throw error
          }

          const internalDimensionsText = formatMaterialInternalDimensions(
            m.internalDimensions
          )

          return (
            <div
              key={m.id}
              onClick={() => onEdit(m)}
              className='relative overflow-hidden rounded-[28px] border border-dashed border-muted/50 bg-background/50 p-5 transition-all active:scale-[0.98]'
            >
              <div className='absolute top-0 right-0 p-2'>
                <Badge
                  variant='outline'
                  className='h-4 rounded-full border-none bg-primary/5 text-[8px] font-black tracking-widest text-primary/60 uppercase italic'
                >
                  {resolveMaterialCategoryLabel(m.category, categoryOptions)}
                </Badge>
              </div>

              <div className='flex flex-col gap-3'>
                <div className='flex items-center gap-2'>
                  <Hash className='size-3 text-primary opacity-40' />
                  <span className='text-[10px] font-black tracking-tighter text-muted-foreground/60 italic tabular-nums'>
                    {m.code}
                  </span>
                </div>

                <h4 className='text-sm leading-tight font-black tracking-tight uppercase italic'>
                  {m.name}
                </h4>

                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {internalDimensionsText ? (
                    <Badge
                      variant='outline'
                      className='h-4 rounded-full border-none bg-primary/10 px-2 py-0 font-mono text-[8px] font-black tracking-tighter text-primary uppercase'
                    >
                      {t('materialArchive.mobile.internalDimensions', {
                        value: internalDimensionsText,
                      })}
                    </Badge>
                  ) : m.spec ? (
                    <span className='text-[9px] font-bold text-muted-foreground/70 uppercase'>
                      {m.spec}
                    </span>
                  ) : null}
                  <Badge
                    variant='secondary'
                    className='h-4 rounded-full border-none bg-muted/30 px-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase italic'
                  >
                    {m.uom}
                  </Badge>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
