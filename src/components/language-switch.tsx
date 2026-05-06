import { Check, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-8.5 w-8.5 rounded-full border border-dashed border-border/60 bg-background/90 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
        >
          <Languages className='size-4' />
          <span className='sr-only'>{t('common.language.switcher')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56 rounded-[28px] border border-dashed border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur-xl'
        align='end'
        sideOffset={10}
      >
        <DropdownMenuItem className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground' onClick={() => setLocale('zh-CN')}>
          {t('common.language.zhCN')}
          <Check size={14} className={cn('ms-auto text-primary', locale !== 'zh-CN' && 'hidden')} />
        </DropdownMenuItem>
        <DropdownMenuItem className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground' onClick={() => setLocale('en-US')}>
          {t('common.language.enUS')}
          <Check size={14} className={cn('ms-auto text-primary', locale !== 'en-US' && 'hidden')} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
