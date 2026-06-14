type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4 md:p-8'>
      {/* 🔮 背景装饰：极细几何网格 */}
      <div
        className='absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-[0.03] dark:opacity-[0.02]'
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className='relative z-10 w-full max-w-[1100px] animate-in duration-1000 fade-in zoom-in'>
        {children}
      </div>
    </div>
  )
}
