import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface BasePlaceholderProps {
  title: string
  description: string
  icon: any
}

export function BasePlaceholder({
  title,
  description,
  icon: Icon,
}: BasePlaceholderProps) {
  return (
    <div className='flex flex-col items-center justify-center p-8 text-center'>
      <div className='mb-6 flex size-20 items-center justify-center rounded-full bg-primary/5 shadow-inner'>
        <Icon className='size-10 text-primary/40' />
      </div>
      <h3 className='text-xl font-black tracking-tight text-foreground uppercase'>
        {title}
      </h3>
      <p className='mt-3 max-w-md text-sm leading-relaxed font-medium text-muted-foreground italic'>
        {description}
      </p>
      <div className='mt-10 flex items-center gap-4'>
        <Button
          variant='outline'
          className='rounded-full border-dashed px-8'
          disabled
        >
          模块初始化中...
        </Button>
        <Button className='rounded-full bg-primary px-8 hover:bg-primary/90'>
          申请测试权限
        </Button>
      </div>

      <div className='mt-16 grid w-full max-w-4xl grid-cols-3 gap-6'>
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className='cursor-not-allowed border-none bg-muted/30 opacity-40 shadow-none grayscale select-none'
          >
            <CardContent className='space-y-2 p-6 text-start'>
              <div className='size-8 rounded-lg bg-background' />
              <div className='h-4 w-24 rounded bg-background' />
              <div className='h-3 w-32 rounded bg-background' />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
