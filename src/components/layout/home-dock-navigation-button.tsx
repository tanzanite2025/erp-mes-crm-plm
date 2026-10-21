import { Link, useLocation } from '@tanstack/react-router'
import { House } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function HomeDockNavigationButton() {
  const { t } = useLanguage()
  const isActive = useLocation({
    select: (location) => location.pathname === '/home',
  })

  return (
    <Button
      asChild
      variant='outline'
      size='icon'
      className={cn(
        'size-11 rounded-full border-border/70 bg-background/85 text-muted-foreground shadow-none transition-all hover:bg-accent hover:text-foreground active:scale-95 sm:active:scale-100 dark:bg-background/60',
        isActive &&
          'border-primary/30 bg-primary text-primary-foreground shadow-xl shadow-primary/15 hover:bg-primary hover:text-primary-foreground dark:bg-primary dark:text-primary-foreground'
      )}
    >
      <Link
        to='/home'
        aria-label={t('home.title')}
        title={t('home.title')}
        aria-current={isActive ? 'page' : undefined}
      >
        <House aria-hidden='true' className='size-4' />
      </Link>
    </Button>
  )
}
