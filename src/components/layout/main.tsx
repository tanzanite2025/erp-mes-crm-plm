import { cn } from '@/lib/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'min-w-0 px-4 pt-4 pb-6',

        // If layout is fixed, make the main container flex and grow
        fixed && 'flex min-h-0 grow flex-col overflow-hidden',

        // Keep fixed workspace controls relative to the viewport. Size-query
        // containment belongs on tables/pagination, not their page ancestors.
        !fluid && 'w-full max-w-none',
        className
      )}
      {...props}
    />
  )
}
