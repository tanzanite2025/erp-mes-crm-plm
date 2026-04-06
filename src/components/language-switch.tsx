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
        <Button variant='ghost' size='icon' className='scale-95 rounded-full'>
          <Languages className='size-[1.2rem]' />
          <span className='sr-only'>{t('common.language.switcher')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setLocale('zh-CN')}>
          {t('common.language.zhCN')}
          <Check size={14} className={cn('ms-auto', locale !== 'zh-CN' && 'hidden')} />
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale('en-US')}>
          {t('common.language.enUS')}
          <Check size={14} className={cn('ms-auto', locale !== 'en-US' && 'hidden')} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
