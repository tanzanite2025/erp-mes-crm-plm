'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ProductionRestrictionsProps {
  restrictions: string[]
  setRestrictions: (nextRestrictions: string[]) => void
}

export function ProductionRestrictions({
  restrictions,
  setRestrictions,
}: ProductionRestrictionsProps) {
  const { t } = useLanguage()
  const [newTag, setNewTag] = useState('')

  const handleAddTag = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (!newTag.trim()) return
    const tags = [...restrictions]
    if (!tags.includes(newTag.trim())) {
      setRestrictions([...tags, newTag.trim()])
    }
    setNewTag('')
  }

  return (
    <div className='group space-y-1 rounded-[18px] border border-dashed border-muted bg-muted/5 p-1.5 transition-all hover:bg-muted/10'>
      <div className='flex items-center justify-between border-b border-dashed border-muted pb-1'>
        <h4 className='text-[10px] font-black tracking-widest text-rose-700 uppercase italic dark:text-rose-400'>
          {t('engineering.productMgmt.restrictions.title')}
        </h4>
        <p className='text-[8px] font-black tracking-tighter text-slate-500 uppercase italic'>
          {t('engineering.productMgmt.restrictions.separator')}
        </p>
      </div>
      <div className='flex flex-col gap-1.5'>
        <div className='flex min-h-[28px] flex-wrap gap-1 rounded-xl border border-dashed border-muted/50 bg-muted/20 p-1 shadow-inner transition-all group-hover:bg-muted/30'>
          {restrictions.length > 0 ? (
            restrictions.map((tag: string) => (
              <Badge
                key={tag}
                variant='outline'
                className='h-6 gap-1.5 rounded-full border-none bg-rose-500 px-2 text-[10px] font-black text-white uppercase shadow-md shadow-rose-500/10'
              >
                {tag}
                <button
                  type='button'
                  onClick={() =>
                    setRestrictions(
                      restrictions.filter((t: string) => t !== tag)
                    )
                  }
                  className='transition-transform hover:scale-110'
                >
                  <X className='size-3 stroke-3' />
                </button>
              </Badge>
            ))
          ) : (
            <div className='flex items-center gap-2 px-1 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
              <span>{t('engineering.productMgmt.restrictions.null')}</span>
            </div>
          )}
        </div>
        <div className='flex gap-1.5'>
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                e.preventDefault()
                handleAddTag()
              }
            }}
            placeholder={t('engineering.productMgmt.restrictions.placeholder')}
            className='h-8 flex-1 rounded-xl border-none bg-muted/40 text-[11px] font-black tracking-widest uppercase italic focus-visible:ring-rose-400'
          />
          <Button
            type='button'
            size='sm'
            onClick={handleAddTag}
            className='h-8 shrink-0 rounded-full bg-rose-600 px-3 text-[11px] font-black tracking-widest text-white uppercase shadow-md shadow-rose-600/10 transition-all hover:bg-rose-700 active:scale-95 sm:px-4'
          >
            <span className='hidden sm:inline'>
              {t('engineering.productMgmt.restrictions.addButton')}
            </span>
            <span className='sm:hidden'>
              {t('engineering.productMgmt.restrictions.addButtonShort')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
