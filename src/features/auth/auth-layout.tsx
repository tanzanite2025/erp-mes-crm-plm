type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative min-h-svh w-full overflow-hidden bg-background flex items-center justify-center p-4 md:p-8'>
      {/* 🔮 背景装饰：极细几何网格 */}
      <div className='absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]' 
           style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className='relative z-10 w-full max-w-[1100px] animate-in fade-in zoom-in duration-1000'>
        {children}
      </div>
    </div>
  )
}
