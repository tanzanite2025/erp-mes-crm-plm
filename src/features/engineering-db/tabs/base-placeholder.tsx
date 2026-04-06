import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface BasePlaceholderProps {
    title: string
    description: string
    icon: any
}

export function BasePlaceholder({ title, description, icon: Icon }: BasePlaceholderProps) {
    return (
        <div className='p-8 flex flex-col items-center justify-center text-center'>
            <div className='size-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 shadow-inner'>
                <Icon className='size-10 text-primary/40' />
            </div>
            <h3 className='text-xl font-black tracking-tight text-foreground uppercase'>{title}</h3>
            <p className='text-sm mt-3 max-w-md text-muted-foreground font-medium leading-relaxed italic'>
                {description}
            </p>
            <div className='mt-10 flex items-center gap-4'>
                <Button variant='outline' className='rounded-full px-8 border-dashed' disabled>模块初始化中...</Button>
                <Button className='rounded-full px-8 bg-primary hover:bg-primary/90'>
                    申请测试权限
                </Button>
            </div>
            
            <div className='mt-16 grid grid-cols-3 gap-6 w-full max-w-4xl'>
                {[1, 2, 3].map(i => (
                    <Card key={i} className='bg-muted/30 border-none shadow-none grayscale opacity-40 select-none cursor-not-allowed'>
                        <CardContent className='p-6 text-start space-y-2'>
                            <div className='size-8 rounded-lg bg-background' />
                            <div className='h-4 w-24 bg-background rounded' />
                            <div className='h-3 w-32 bg-background rounded' />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
