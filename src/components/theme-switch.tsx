import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLanguage()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const nextThemeLabel =
    nextTheme === 'dark' ? t('common.theme.dark') : t('common.theme.light')

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = resolvedTheme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [resolvedTheme])

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      aria-label={t('common.theme.switcher')}
      title={nextThemeLabel}
      onClick={() => setTheme(nextTheme)}
      className='relative h-8.5 w-8.5 rounded-full border border-dashed border-border/60 bg-background/90 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
    >
      <Sun className='size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
      <Moon className='absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
      <span className='sr-only'>{t('common.theme.switcher')}</span>
    </Button>
  )
}
