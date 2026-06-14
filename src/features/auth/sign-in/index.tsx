import { useSearch } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { t } = useLanguage()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      {/* 🚀 主容器：40px 物理极限圆角 + 大面积磨砂玻璃 */}
      <div className='relative flex min-h-[600px] w-full flex-col overflow-hidden rounded-[40px] border border-border/40 bg-card/70 shadow-2xl backdrop-blur-2xl lg:flex-row'>
        {/* 🌗 左翼：纯净功能区 (45%) */}
        <div className='relative flex w-full flex-col items-center justify-between bg-card/30 p-10 lg:w-[45%] lg:p-12'>
          {/* 🔮 移动端专属装饰：流光顶栏 */}
          <div className='absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30 lg:hidden' />

          <div className='w-full'>
            {/* 🏷️ 品牌与标题组 */}
            <div className='mb-10 flex flex-col'>
              <div className='mb-4 inline-flex items-center gap-2'>
                <div className='size-2 animate-pulse rounded-full bg-primary' />
                <span className='text-[10px] font-black tracking-[0.4em] text-muted-foreground/60 uppercase'>
                  {t('common.auth.layout.connectivity')}
                </span>
              </div>
              <h1 className='text-3xl font-black tracking-tighter text-foreground uppercase italic'>
                {t('common.auth.layout.title')}
              </h1>
              <p className='mt-1 text-[11px] leading-none font-black tracking-[0.2em] text-muted-foreground/60 uppercase'>
                {t('common.auth.layout.title', { locale: 'en-US' }) ===
                '数字化管理系统'
                  ? 'Digital Management System'
                  : t('common.auth.layout.title')}
              </p>
            </div>

            <UserAuthForm redirectTo={redirect} className='w-full' />
          </div>

          {/* 🔗 底部页脚 */}
          <div className='mt-12 w-full'>
            <p className='text-center text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('common.auth.layout.description')}
            </p>
          </div>
        </div>

        {/* 🌘 右翼：3D 沉浸视觉区 (55%) */}
        <div className='relative hidden w-[55%] overflow-hidden bg-background lg:flex'>
          {/* 🔮 底色渐变与网格纹理 (防止图片不显示时的突兀感) */}
          <div className='absolute inset-0 z-0 bg-gradient-to-br from-primary/40 via-background to-black' />
          <div
            className='absolute inset-0 z-0 opacity-20'
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* 🔮 渐变遮罩层：增加景深 */}
          <div className='absolute inset-0 z-10 bg-gradient-to-br from-primary/20 via-transparent to-slate-950/60 opacity-80 mix-blend-multiply' />

          {/* 🖼️ 英雄插画 (请手动将图片拷贝至 public/login-hero.png) */}
          <div
            className='absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110'
            style={{ backgroundImage: `url('/login-hero.png')` }}
          ></div>

          <div className='relative z-20 mt-auto p-12 text-white'>
            <div className='max-w-xs translate-y-4 animate-in space-y-2 duration-1000 slide-in-from-bottom'>
              <h2 className='text-2xl font-black tracking-tighter uppercase italic'>
                {t('common.auth.layout.smartFactory')}
              </h2>
              <p className='text-[10px] leading-relaxed font-medium tracking-widest uppercase opacity-60'>
                {t('common.auth.layout.factoryDesc')}
              </p>
            </div>
          </div>

          {/* 装饰物：浮动网格或光晕 */}
          <div className='absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 opacity-50 mix-blend-screen blur-[120px]' />
        </div>
      </div>
    </AuthLayout>
  )
}
