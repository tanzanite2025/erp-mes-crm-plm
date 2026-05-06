import { useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const { t } = useLanguage()

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = theme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [theme])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-8.5 w-8.5 rounded-full border border-dashed border-border/60 bg-background/90 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
        >
          <Sun className='size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
          <Moon className='absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
          <span className='sr-only'>{t('common.theme.switcher')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56 rounded-[28px] border border-dashed border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur-xl'
        align='end'
        sideOffset={10}
      >
        <DropdownMenuItem className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground' onClick={() => setTheme('light')}>
          {t('common.theme.light')}{' '}
          <Check
            size={14}
            className={cn('ms-auto text-primary', theme !== 'light' && 'hidden')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground' onClick={() => setTheme('dark')}>
          {t('common.theme.dark')}
          <Check
            size={14}
            className={cn('ms-auto text-primary', theme !== 'dark' && 'hidden')}
          />
        </DropdownMenuItem>
        <DropdownMenuItem className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground' onClick={() => setTheme('system')}>
          {t('common.theme.system')}
          <Check
            size={14}
            className={cn('ms-auto text-primary', theme !== 'system' && 'hidden')}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
