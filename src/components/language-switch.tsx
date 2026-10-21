import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage()
  const nextLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN'
  const nextLanguageLabel = t(
    nextLocale === 'zh-CN' ? 'common.language.zhCN' : 'common.language.enUS'
  )
  const switchLanguageLabel = `${t('common.language.switcher')}: ${nextLanguageLabel}`

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      title={switchLanguageLabel}
      aria-label={switchLanguageLabel}
      onClick={() => setLocale(nextLocale)}
      className='relative h-8.5 min-w-14 gap-1 rounded-full border border-dashed border-border/60 bg-background/90 px-2 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
    >
      <span aria-hidden='true' className='text-sm leading-none'>
        {locale === 'zh-CN' ? '🇨🇳' : '🇺🇸'}
      </span>
      <span
        aria-hidden='true'
        className='text-[11px] leading-none font-black tracking-tight'
      >
        {locale === 'zh-CN' ? 'ZH' : 'EN'}
      </span>
      <span className='sr-only'>{switchLanguageLabel}</span>
    </Button>
  )
}
